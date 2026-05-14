# @occupancy/r49

Core library for managing `.r49` railroad layout archives.

## Features
- **Strict Validation**: Uses Zod to ensure manifest data follows the version 3 schema.
- **Archive Management**: Built on `JSZip` for in-memory management of images and metadata.
- **Universal**: Works in Node.js and modern browsers.

## Usage

### Installation
```bash
pnpm add @occupancy/r49
```

### Basic Example
```typescript
import { R49Archive } from '@occupancy/r49';
import fs from 'node:fs';

async function main() {
  // Load an existing archive
  const data = fs.readFileSync('layout.r49');
  const archive = await R49Archive.load(data);

  // Access manifest data
  const manifest = archive.getManifest();
  console.log(`Layout: ${manifest.layout.name}`);

  // Modify manifest
  manifest.layout.description = 'Updated layout description';
  archive.setManifest(manifest);

  // Add a new image
  const imageBuffer = fs.readFileSync('new-shot.jpg');
  await archive.addImage('new-shot.jpg', imageBuffer);

  // Export updated archive
  const updatedData = await archive.export();
  fs.writeFileSync('layout-v3.r49', updatedData);
}
```

### Migration / Legacy Support
To read older versions without validation errors (e.g., for migration scripts), use `loadUnsafe`:

```typescript
const { archive, rawManifest } = await R49Archive.loadUnsafe(data);
console.log('Original Version:', rawManifest.version);
```

## Manifest Schema (v3)
The library enforces the following layout structure:
- `p0`, `p1`: Calibration points (rect-0 and rect-2 from v2).
- `size_mm`: Calculated physical size of the layout.
- `version`: Fixed to `3`.
