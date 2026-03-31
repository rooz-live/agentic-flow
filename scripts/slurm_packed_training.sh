# --- Goalie Code Fix: cluster-fragmentation ---

# SLURM job packing optimization
#!/bin/bash
#SBATCH --job-name=packed_training
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=4
#SBATCH --gres=gpu:4
#SBATCH --exclusive

# Prefer packing jobs tightly on fewer nodes
srun --ntasks=$SLURM_NTASKS --ntasks-per-node=$SLURM_NTASKS_PER_NODE   python -m torch.distributed.run --nproc_per_node=4 train.py

