# Project Tooling and Environment

This project uses a hybrid environment of **TypeScript** and **Python**. To maintain consistency and reduce implementation overhead, we follow a specific architectural pattern for data handling and environment isolation.

## 🏗 Project Structure

```text
.
├── ui/                   # TypeScript: Web-based configuration UI
├── detect/               # TypeScript: Real-time inference service
├── lib/r49/              # TypeScript: Core .r49 format parser and ZIP handler
├── dataset/              # TypeScript: CLI tool to process .r49 into training data
├── cnn/                  # Python: CNN training and model logic (PyTorch)
└── doc/                  # Documentation
```

## 🛠 Strategic Decisions

### 1. Single-Language Parser Strategy
To avoid the complexity and bugs associated with maintaining the `.r49` file format parser in multiple languages, **TypeScript is the sole owner of the `.r49` logic.**

- **`lib/r49`**: Contains all logic for unzipping `.r49` archives and parsing the internal JSON manifest.
- **`dataset/`**: A TypeScript-based utility that uses `lib/r49` to "export" data. It transforms complex `.r49` files into simple directories of images and flat JSON/CSV files.
- **`cnn/`**: The Python environment remains clean and ML-focused. It consumes the simplified output from the `dataset` tool, meaning the Python code never needs to implement ZIP or complex manifest parsing.

### 2. Environment Isolation

#### TypeScript (Frontend & Services)
- **Tooling**: Managed via **pnpm workspaces** (recommended for speed and disk efficiency).
- **Runtime**: Node.js for services (`detect`, `dataset`) and modern browsers for the `ui`.
- **Execution**: Use `tsx` for running TypeScript CLI tools without a separate compilation step.

#### Python (Machine Learning)
- **Tooling**: **uv** for ultra-fast dependency management and environment isolation.
- **Focus**: Purely on model architecture, training, and ONNX export.
- **Data Consumption**: Reads pre-processed data from the `dataset/out/` directory.

#### Environment Management
- **Tooling**: **direnv** to automatically load the Python virtual environment and set up the path when entering the project directory.
- **Configuration**: Managed via a root `.envrc` file.

---

## 🚀 Common Workflows

### Preparing Data for Training
1. Place new `.r49` files in `dataset/r49/`.
2. Run the TS dataset crop and split extraction tool:
   ```bash
   pnpm --filter dataset run prep
   ```
3. The tool extracts image crops and structures them in `dataset/db/` with train/validation subfolders.
4. Open and run the machine learning pipeline notebook in `cnn/`:
   - Notebook: `cnn/TRAIN.ipynb`

### Updating the .r49 Format
If the manifest structure changes:
1. Update types and parser logic in `lib/r49/`.
2. Update the `dataset` tool export logic if necessary.
3. The Python CNN remains largely unaffected unless the fundamental label structure changes.
