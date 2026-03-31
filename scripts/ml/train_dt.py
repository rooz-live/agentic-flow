#!/usr/bin/env python3
"""
Decision Transformer Training Script
====================================

Trains a Decision Transformer model on agentic-flow trajectories for
sequence-based governance policy learning.

Architecture:
- Transformer encoder with causal masking
- Input: (return-to-go, state, action) tuples
- Output: action predictions
- Loss: cross-entropy on action sequence

Usage:
    python scripts/ml/train_dt.py --epochs 10 --batch-size 32
    python scripts/ml/train_dt.py --eval-only --checkpoint .goalie/dt_model.pt
"""

import argparse
import json
import random
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import Dataset, DataLoader
except ImportError:
    print("⚠️  PyTorch not installed. Install with: pip3 install torch")
    exit(1)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DT_TRAJECTORIES = PROJECT_ROOT / ".goalie" / "dt_trajectories.jsonl"
MODEL_CHECKPOINT = PROJECT_ROOT / ".goalie" / "dt_model.pt"

# Model hyperparameters
STATE_DIM = 31
ACTION_DIM = 5
HIDDEN_DIM = 128
NUM_HEADS = 4
NUM_LAYERS = 3
MAX_SEQ_LENGTH = 100  # Context window
DROPOUT = 0.1


class TrajectoryDataset(Dataset):
    """Dataset for loading DT trajectories."""
    
    def __init__(self, trajectories_file: Path, max_seq_len: int = 100):
        self.max_seq_len = max_seq_len
        self.trajectories = []
        
        with open(trajectories_file, "r") as f:
            for line in f:
                traj = json.loads(line)
                # Split long trajectories into chunks
                length = traj["length"]
                if length > max_seq_len:
                    # Create overlapping chunks
                    for i in range(0, length - max_seq_len + 1, max_seq_len // 2):
                        chunk = {
                            "observations": traj["observations"][i:i + max_seq_len],
                            "actions": traj["actions"][i:i + max_seq_len],
                            "returns_to_go": traj["returns_to_go"][i:i + max_seq_len],
                            "timesteps": list(range(len(traj["observations"][i:i + max_seq_len])))
                        }
                        self.trajectories.append(chunk)
                else:
                    self.trajectories.append(traj)
        
        print(f"Loaded {len(self.trajectories)} trajectory chunks")
    
    def __len__(self):
        return len(self.trajectories)
    
    def __getitem__(self, idx):
        traj = self.trajectories[idx]
        
        # Pad/truncate to max_seq_len
        length = len(traj["observations"])
        pad_len = max(0, self.max_seq_len - length)
        
        observations = np.array(traj["observations"][:self.max_seq_len])
        actions = np.array(traj["actions"][:self.max_seq_len])
        returns_to_go = np.array(traj["returns_to_go"][:self.max_seq_len])
        timesteps = np.array(traj["timesteps"][:self.max_seq_len])
        
        # Pad
        if pad_len > 0:
            observations = np.vstack([observations, np.zeros((pad_len, STATE_DIM))])
            actions = np.concatenate([actions, np.zeros(pad_len)])
            returns_to_go = np.concatenate([returns_to_go, np.zeros(pad_len)])
            timesteps = np.concatenate([timesteps, np.zeros(pad_len)])
        
        # Attention mask (1 for real tokens, 0 for padding)
        attention_mask = np.ones(length)
        if pad_len > 0:
            attention_mask = np.concatenate([attention_mask, np.zeros(pad_len)])
        
        return {
            "observations": torch.FloatTensor(observations),
            "actions": torch.LongTensor(actions.astype(int)),
            "returns_to_go": torch.FloatTensor(returns_to_go),
            "timesteps": torch.LongTensor(timesteps.astype(int)),
            "attention_mask": torch.FloatTensor(attention_mask)
        }


class DecisionTransformer(nn.Module):
    """Simplified Decision Transformer for agentic governance."""
    
    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dim: int,
        num_heads: int,
        num_layers: int,
        max_seq_len: int,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.hidden_dim = hidden_dim
        
        # Embeddings
        self.state_encoder = nn.Linear(state_dim, hidden_dim)
        self.action_encoder = nn.Embedding(action_dim, hidden_dim)
        self.return_encoder = nn.Linear(1, hidden_dim)
        self.timestep_encoder = nn.Embedding(max_seq_len, hidden_dim)
        
        # Transformer
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # Action prediction head
        self.action_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, action_dim)
        )
        
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, states, actions, returns_to_go, timesteps, attention_mask=None):
        """
        Forward pass.
        
        Args:
            states: (batch, seq_len, state_dim)
            actions: (batch, seq_len)
            returns_to_go: (batch, seq_len)
            timesteps: (batch, seq_len)
            attention_mask: (batch, seq_len)
        
        Returns:
            action_logits: (batch, seq_len, action_dim)
        """
        batch_size, seq_len = states.shape[0], states.shape[1]
        
        # Embed each modality
        state_emb = self.state_encoder(states)  # (batch, seq_len, hidden)
        action_emb = self.action_encoder(actions)  # (batch, seq_len, hidden)
        return_emb = self.return_encoder(returns_to_go.unsqueeze(-1))  # (batch, seq_len, hidden)
        time_emb = self.timestep_encoder(timesteps)  # (batch, seq_len, hidden)
        
        # Stack: (return, state, action) per timestep
        # Simple approach: sum embeddings + time
        tokens = state_emb + return_emb + time_emb
        tokens = self.dropout(tokens)
        
        # Create causal mask (prevent future information leakage)
        causal_mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
        causal_mask = causal_mask.to(states.device)
        
        # Transform
        hidden = self.transformer(tokens, mask=causal_mask)
        
        # Predict actions
        action_logits = self.action_head(hidden)
        
        return action_logits


def train_epoch(model, dataloader, optimizer, device):
    """Train for one epoch."""
    model.train()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0
    
    for batch in dataloader:
        observations = batch["observations"].to(device)
        actions = batch["actions"].to(device)
        returns_to_go = batch["returns_to_go"].to(device)
        timesteps = batch["timesteps"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        
        # Forward
        action_logits = model(observations, actions, returns_to_go, timesteps, attention_mask)
        
        # Loss (cross-entropy on non-padded actions)
        loss = F.cross_entropy(
            action_logits.reshape(-1, model.action_dim),
            actions.reshape(-1),
            reduction='none'
        )
        loss = (loss * attention_mask.reshape(-1)).sum() / attention_mask.sum()
        
        # Backward
        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        
        # Metrics
        preds = action_logits.argmax(dim=-1)
        correct = ((preds == actions) * attention_mask).sum().item()
        samples = attention_mask.sum().item()
        
        total_loss += loss.item() * samples
        total_correct += correct
        total_samples += samples
    
    avg_loss = total_loss / total_samples
    accuracy = total_correct / total_samples
    
    return avg_loss, accuracy


def evaluate(model, dataloader, device):
    """Evaluate model."""
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0
    
    with torch.no_grad():
        for batch in dataloader:
            observations = batch["observations"].to(device)
            actions = batch["actions"].to(device)
            returns_to_go = batch["returns_to_go"].to(device)
            timesteps = batch["timesteps"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            
            action_logits = model(observations, actions, returns_to_go, timesteps, attention_mask)
            
            loss = F.cross_entropy(
                action_logits.reshape(-1, model.action_dim),
                actions.reshape(-1),
                reduction='none'
            )
            loss = (loss * attention_mask.reshape(-1)).sum() / attention_mask.sum()
            
            preds = action_logits.argmax(dim=-1)
            correct = ((preds == actions) * attention_mask).sum().item()
            samples = attention_mask.sum().item()
            
            total_loss += loss.item() * samples
            total_correct += correct
            total_samples += samples
    
    avg_loss = total_loss / total_samples
    accuracy = total_correct / total_samples
    
    return avg_loss, accuracy


def main():
    parser = argparse.ArgumentParser(description="Train Decision Transformer")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--eval-only", action="store_true")
    parser.add_argument("--checkpoint", type=Path, default=MODEL_CHECKPOINT)
    parser.add_argument("--data", type=Path, default=DT_TRAJECTORIES)
    args = parser.parse_args()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🔧 Using device: {device}")
    
    # Load dataset
    print(f"📊 Loading trajectories from {args.data}...")
    dataset = TrajectoryDataset(args.data, max_seq_len=MAX_SEQ_LENGTH)
    
    # Split train/val (80/20)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)
    
    print(f"   Train: {len(train_dataset)} chunks, Val: {len(val_dataset)} chunks")
    
    # Create model
    print("🏗️  Building Decision Transformer...")
    model = DecisionTransformer(
        state_dim=STATE_DIM,
        action_dim=ACTION_DIM,
        hidden_dim=HIDDEN_DIM,
        num_heads=NUM_HEADS,
        num_layers=NUM_LAYERS,
        max_seq_len=MAX_SEQ_LENGTH,
        dropout=DROPOUT
    ).to(device)
    
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"   Model parameters: {total_params:,}")
    
    # Load checkpoint if eval mode
    if args.eval_only:
        if args.checkpoint.exists():
            model.load_state_dict(torch.load(args.checkpoint, map_location=device))
            print(f"✅ Loaded checkpoint from {args.checkpoint}")
        else:
            print(f"❌ Checkpoint not found: {args.checkpoint}")
            return
        
        val_loss, val_acc = evaluate(model, val_loader, device)
        print(f"\n📊 Evaluation Results:")
        print(f"   Val Loss: {val_loss:.4f}")
        print(f"   Val Accuracy: {val_acc:.1%}")
        return
    
    # Training
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    
    print(f"\n🚀 Training for {args.epochs} epochs...")
    best_val_acc = 0.0
    
    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, device)
        val_loss, val_acc = evaluate(model, val_loader, device)
        
        print(f"Epoch {epoch+1}/{args.epochs} | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:.1%} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.1%}")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), args.checkpoint)
            print(f"   ✅ Saved checkpoint (val_acc={val_acc:.1%})")
    
    print(f"\n✅ Training complete! Best val accuracy: {best_val_acc:.1%}")
    print(f"💾 Model saved to {args.checkpoint}")


if __name__ == "__main__":
    main()
