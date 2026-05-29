import fs from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageService {
  uploadFile(
    file: File | { name: string; size: number; buffer: Buffer; mimeType: string },
    folderPath: string
  ): Promise<{ s3Key: string; fileUrl: string; sizeBytes: number }>;
  
  getSignedUrl(s3Key: string): Promise<string>;
  
  deleteFile(s3Key: string): Promise<void>;

  createSignedUploadUrl(
    s3Key: string
  ): Promise<{ signedUrl: string; token: string; path: string }>;
}

export class LocalStorageService implements StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (e) {
      // Ignore
    }
  }

  async uploadFile(
    file: File | { name: string; size: number; buffer: Buffer; mimeType: string },
    folderPath: string
  ): Promise<{ s3Key: string; fileUrl: string; sizeBytes: number }> {
    await this.ensureDir();
    
    const fileName = "name" in file ? file.name : (file as any).name;
    const size = "size" in file ? file.size : (file as any).size;
    
    // Create a unique S3 key / file name
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${timestamp}-${cleanFileName}`;
    
    // The virtual S3 key to store in DB
    const s3Key = path.join(folderPath, uniqueName);
    
    // The physical disk path on the local public directory
    const diskPath = path.join(this.uploadDir, uniqueName);
    
    // Write buffer to file
    let buffer: Buffer;
    if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if ("buffer" in file) {
      buffer = file.buffer;
    } else {
      throw new Error("Invalid file format");
    }

    await fs.writeFile(diskPath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;

    return {
      s3Key,
      fileUrl,
      sizeBytes: size,
    };
  }

  async getSignedUrl(s3Key: string): Promise<string> {
    // For local mockup storage, just return the direct public URL path.
    const uniqueName = path.basename(s3Key);
    return `/uploads/${uniqueName}`;
  }

  async deleteFile(s3Key: string): Promise<void> {
    const uniqueName = path.basename(s3Key);
    const diskPath = path.join(this.uploadDir, uniqueName);
    try {
      await fs.unlink(diskPath);
    } catch (e) {
      // Ignore
    }
  }

  async createSignedUploadUrl(
    s3Key: string
  ): Promise<{ signedUrl: string; token: string; path: string }> {
    throw new Error("createSignedUploadUrl is not supported in LocalStorageService");
  }
}

export class R2StorageService implements StorageService {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || "faberdoc-files";

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });
  }

  async uploadFile(
    file: File | { name: string; size: number; buffer: Buffer; mimeType: string },
    folderPath: string
  ): Promise<{ s3Key: string; fileUrl: string; sizeBytes: number }> {
    const fileName = "name" in file ? file.name : (file as any).name;
    const size = "size" in file ? file.size : (file as any).size;
    const mimeType = "mimeType" in file ? file.mimeType : (file as any).mimeType || "application/octet-stream";

    let buffer: Buffer;
    if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if ("buffer" in file) {
      buffer = file.buffer;
    } else {
      throw new Error("Invalid file format");
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${timestamp}-${cleanFileName}`;
    
    // Normalize S3 key format (replace backslashes from path.join for cross-platform compatibility)
    const s3Key = `${folderPath}/${uniqueName}`.replace(/\\/g, "/").replace(/\/+/g, "/");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const fileUrl = `/api/files/download?key=${encodeURIComponent(s3Key)}`;

    return {
      s3Key,
      fileUrl,
      sizeBytes: size,
    };
  }

  async getSignedUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    // Sign URL for 15 minutes (900 seconds)
    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  async deleteFile(s3Key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      })
    );
  }

  async createSignedUploadUrl(
    s3Key: string
  ): Promise<{ signedUrl: string; token: string; path: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    // Sign PUT upload for 15 minutes (900 seconds)
    const signedUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });
    return { signedUrl, token: "", path: s3Key };
  }
}

export class SupabaseStorageService implements StorageService {
  private bucketName = "faberdoc-files";

  async uploadFile(
    file: File | { name: string; size: number; buffer: Buffer; mimeType: string },
    folderPath: string
  ): Promise<{ s3Key: string; fileUrl: string; sizeBytes: number }> {
    const fileName = "name" in file ? file.name : (file as any).name;
    const size = "size" in file ? file.size : (file as any).size;
    const mimeType = "mimeType" in file ? file.mimeType : (file as any).mimeType || "application/octet-stream";

    let buffer: Buffer;
    if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if ("buffer" in file) {
      buffer = file.buffer;
    } else {
      throw new Error("Invalid file format");
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${timestamp}-${cleanFileName}`;
    const s3Key = `${folderPath}/${uniqueName}`.replace(/\\/g, "/").replace(/\/+/g, "/");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
      .from(this.bucketName)
      .upload(s3Key, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    const fileUrl = `/api/files/download?key=${encodeURIComponent(s3Key)}`;

    return {
      s3Key,
      fileUrl,
      sizeBytes: size,
    };
  }

  async getSignedUrl(s3Key: string): Promise<string> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from(this.bucketName)
      .createSignedUrl(s3Key, 900); // 15 mins

    if (error || !data) {
      throw new Error(`Failed to generate signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }

  async deleteFile(s3Key: string): Promise<void> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
      .from(this.bucketName)
      .remove([s3Key]);

    if (error) {
      console.error("Failed to delete file from Supabase Storage:", error);
    }
  }

  async createSignedUploadUrl(
    s3Key: string
  ): Promise<{ signedUrl: string; token: string; path: string }> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
      .from(this.bucketName)
      .createSignedUploadUrl(s3Key);

    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message || "Unknown error"}`);
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    };
  }
}

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const isR2Configured =
  process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY;

export const storageService = isSupabaseConfigured
  ? new SupabaseStorageService()
  : isR2Configured
  ? new R2StorageService()
  : new LocalStorageService();
