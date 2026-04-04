# --- Goalie Code Fix: oom-recovery ---

# PyTorch training loop with simple OOM-aware batch size backoff
import torch


def train_epoch(dataloader, model, optimizer, loss_fn, device, batch_size):
    data_iter = iter(dataloader)
    while True:
        try:
            batch = next(data_iter)
        except StopIteration:
            break
        inputs, targets = (b.to(device) for b in batch)
        optimizer.zero_grad()
        try:
            outputs = model(inputs)
            loss = loss_fn(outputs, targets)
            loss.backward()
            optimizer.step()
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                torch.cuda.empty_cache()
                batch_size = max(1, batch_size // 2)
                continue
            raise

