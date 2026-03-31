# --- Goalie Code Fix: hpc-batch-window ---

# SLURM batch script optimization
#!/bin/bash
#SBATCH --job-name=optimized_training
#SBATCH --nodes=8
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --gres=gpu:1
#SBATCH --time=24:00:00
#SBATCH --mem=64G
#SBATCH --partition=gpu

# Optimize batch size based on available memory
BATCH_SIZE=32
if [ $SLURM_CPUS_PER_TASK -gt 16 ]; then
    BATCH_SIZE=64
fi

# Set optimal environment variables
export CUDA_VISIBLE_DEVICES=$SLURM_LOCALID
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK

# Run training with optimized settings
python train.py --batch-size $BATCH_SIZE --num-workers 4

