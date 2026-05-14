# CNN Track Occupancy Classifier

This directory contains the machine learning pipeline for training the track occupancy classifier.

## Training Cycle Instructions

<span style="color:red">**Note:** `TRAIN.ipynb` propvides an interactive experience.</span>

Follow these steps in order to prepare data, train the model, analyze its performance, and export it for deployment.

### 1. Data Preparation
**Command:** `cd ../dataset && pnpm run prep && cd ../cnn` (run from the `dataset/` directory)
*   **What it does:** Scans the `dataset/r49/` directory for `.r49` archives, extracts 136x136 image crops for every labeled marker, and performs a deterministic 80/20 train/validation split using hashing.
*   **Output:** Populates `dataset/db/train/` and `dataset/db/val/` with labeled JPEG images organized into class folders.
*   **Verification:** You can run `uv run bin/visualize_data.py` (in the `cnn/` directory) to see a sample of the augmented 96x96 patches in `results/data_samples.png`.

### 2. Model Training
**Command:** `uv run bin/train.py` (run from this directory)
*   **What it does:** Trains a ResNet-18 model on the prepared dataset. It applies random rotations, color jitter, and flips before center-cropping to 96x96. The script automatically resumes from the latest checkpoint if one exists.
*   **Output:** 
    *   `checkpoints/latest.pt`: The model state from the most recent epoch.
    *   `checkpoints/best.pt`: The model state with the highest validation accuracy.
*   **Interpretation:** Watch the `Acc` (Accuracy) and `Loss` metrics. A successful training run should see loss decreasing and accuracy increasing over time.

### 3. Diagnostics & Insights
**Command:** `uv run bin/diagnostics.py` (run from this directory)
*   **What it does:** Evaluates the `best.pt` model on the validation set and generates visualization tools in the `results/` folder.
*   **Output:**
    *   `results/confusion_matrix.png`: Shows exactly which classes the model is confusing.
    *   `results/top_losses.png`: Displays the 9 images where the model was most confidently wrong.
    *   `results/filters.png`: Visualizes the weights of the first convolutional layer.
*   **Interpretation:** Look for a strong diagonal in the confusion matrix.

### 4. Model Export
**Command:** `uv run bin/export.py` (run from this directory)
*   **What it does:** Converts the PyTorch `best.pt` checkpoint into ONNX and optimized ORT formats compatible with the web UI.
*   **Output:**
    *   `checkpoints/model.ort`: The optimized model for deployment in the browser.
    *   `checkpoints/config.json`: A configuration file containing class names, target DPT, and crop size.
*   **Usage:** Copy these two files into the UI assets folder to deploy the new model.

## Directory Structure
- `bin/`: Executable scripts for training and diagnostics.
- `src/`: Core library code and dataset definitions.
- `results/`: Output visualizations and analysis results.
- `checkpoints/`: Model weights and exported ONNX/ORT files.
