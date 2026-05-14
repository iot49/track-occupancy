import os
import yaml
import torch

def load_config():
    """Loads the shared config.yaml file."""
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../config.yaml"))
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def get_device():
    """Returns the best available torch device (MPS, CUDA, or CPU)."""
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

def get_gauge(scale_name: str, config: dict) -> float:
    """Calculates the rail gauge for a given scale name."""
    standard_gauge = config["STANDARD_GAUGE"]
    scale_2_number = config["SCALE_2_NUMBER"]
    ratio = scale_2_number.get(scale_name, 160)  # Default to N scale
    return standard_gauge / ratio
