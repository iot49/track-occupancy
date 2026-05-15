import JSZip from 'jszip';
import { ManifestDataSchema, type ManifestData, type Image } from './manifest.schema.ts';

export class R49Archive {
  private zip: JSZip;
  private manifest: ManifestData | null = null;

  constructor(zip?: JSZip) {
    this.zip = zip || new JSZip();
  }

  /**
   * Loads an .r49 archive from binary data.
   * By default, it validates the manifest against the current schema (v3).
   */
  static async load(data: Buffer | Blob | ArrayBuffer | Uint8Array): Promise<R49Archive> {
    const size = (data as any).byteLength ?? (data as any).size ?? 0;
    if (size === 0) {
      throw new Error('Cannot load .r49 archive: data is empty');
    }
    try {
      const zip = await JSZip.loadAsync(data);
      const archive = new R49Archive(zip);
      await archive.readAndValidateManifest();
      return archive;
    } catch (err) {
      throw new Error(`Failed to load .r49 archive (size: ${size} bytes): ${err}`);
    }
  }

  /**
   * Loads an .r49 archive without strict manifest validation.
   * Useful for migration scripts or inspecting legacy formats.
   */
  static async loadUnsafe(data: Buffer | Blob | ArrayBuffer | Uint8Array): Promise<{ archive: R49Archive, rawManifest: any }> {
    const zip = await JSZip.loadAsync(data);
    const archive = new R49Archive(zip);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) throw new Error('manifest.json not found');
    const rawManifest = JSON.parse(await manifestFile.async('string'));
    return { archive, rawManifest };
  }

  async readAndValidateManifest(): Promise<ManifestData> {
    const manifestFile = this.zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('manifest.json not found in archive');
    }
    const content = await manifestFile.async('string');
    const json = JSON.parse(content);
    this.manifest = ManifestDataSchema.parse(json);
    return this.manifest;
  }

  async saveManifest(): Promise<void> {
    if (!this.manifest) throw new Error('No manifest data to save');
    this.zip.file('manifest.json', JSON.stringify(this.manifest, null, 2));
  }

  getManifest(): ManifestData {
    if (!this.manifest) throw new Error('Manifest not loaded or invalid');
    return this.manifest;
  }

  setManifest(data: ManifestData): void {
    this.manifest = ManifestDataSchema.parse(data);
  }

  async getImage(filename: string): Promise<Uint8Array | null> {
    const file = this.zip.file(filename);
    if (!file) return null;
    return await file.async('uint8array');
  }

  async addImage(filename: string, data: Uint8Array | Buffer | Blob | ArrayBuffer): Promise<void> {
    this.zip.file(filename, data);
    if (this.manifest) {
      const exists = this.manifest.images.some((img: Image) => img.filename === filename);
      if (!exists) {
        this.manifest.images.push({ filename, labels: {} });
      }
    }
  }

  removeImage(filename: string): void {
    this.zip.remove(filename);
    if (this.manifest) {
      this.manifest.images = this.manifest.images.filter((img: Image) => img.filename !== filename);
    }
  }

  /**
   * Reorders images in the manifest.
   */
  reorderImages(fromIndex: number, toIndex: number): void {
    if (!this.manifest) return;
    const images = this.manifest.images;
    if (fromIndex < 0 || fromIndex >= images.length || toIndex < 0 || toIndex >= images.length) return;
    const [movedImage] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, movedImage);
  }

  // TODO: Implement detector REST API storage integration
  async syncWithDetector(baseUrl: string): Promise<void> {
    console.warn('syncWithDetector not implemented yet', baseUrl);
  }

  async export(): Promise<Uint8Array> {
    await this.saveManifest();
    return await this.zip.generateAsync({ type: 'uint8array' });
  }
}
