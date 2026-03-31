# --- Goalie Code Fix: network-bottleneck ---

# NCCL / MPI tuning for distributed training
export NCCL_DEBUG=INFO
export NCCL_SOCKET_IFNAME=eth0
export NCCL_IB_DISABLE=0
export NCCL_NET_GDR_LEVEL=2
export NCCL_MIN_NCHANNELS=4

python -m torch.distributed.run --nproc_per_node=4 train.py

