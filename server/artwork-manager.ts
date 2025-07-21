import { db } from "./db";
import { orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class ArtworkManager {
  private uploadsDir = './uploads/artwork';
  private maxFileSize = 10 * 1024 * 1024; // 10MB - reduced
  private allowedTypes = ['image/jpeg', 'image/png']; // simplified types

  constructor() {
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }

  // Upload artwork image for an order
  async uploadArtworkImage(orderId: string, imageData: Buffer, filename: string): Promise<string> {
    try {
      const fileExtension = path.extname(filename);
      const uniqueFilename = `${randomUUID()}${fileExtension}`;
      const filepath = path.join(this.uploadsDir, uniqueFilename);

      await fs.writeFile(filepath, imageData);

      // Return the relative URL for the uploaded image
      const imageUrl = `/api/artwork/${uniqueFilename}`;

      // Update order with new image
      await this.addImageToOrder(orderId, imageUrl);

      return imageUrl;
    } catch (error) {
      console.error('Failed to upload artwork image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Add image URL to order's artwork images array
  private async addImageToOrder(orderId: string, imageUrl: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new Error('Order not found');
    }

    const currentImages = (order.artworkImages as string[]) || [];
    const updatedImages = [...currentImages, imageUrl];

    await db
      .update(orders)
      .set({ 
        artworkImages: updatedImages,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
  }

  // Update artwork location
  async updateArtworkLocation(orderId: string, location: string) {
    await db
      .update(orders)
      .set({ 
        artworkLocation: location,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
  }

  // Mark artwork as received
  async markArtworkReceived(orderId: string, received: boolean = true) {
    await db
      .update(orders)
      .set({ 
        artworkReceived: received,
        artworkReceivedDate: received ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
  }

  // Get artwork image file
  async getArtworkImage(filename: string): Promise<Buffer> {
    try {
      const filepath = path.join(this.uploadsDir, filename);
      return await fs.readFile(filepath);
    } catch (error) {
      throw new Error('Image not found');
    }
  }

  // Remove artwork image
  async removeArtworkImage(orderId: string, imageUrl: string) {
    try {
      // Remove from order's image array
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (order && order.artworkImages) {
        const currentImages = (order.artworkImages as string[]) || [];
        const updatedImages = currentImages.filter(url => url !== imageUrl);

        await db
          .update(orders)
          .set({ 
            artworkImages: updatedImages,
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
      }

      // Remove physical file
      const filename = path.basename(imageUrl);
      const filepath = path.join(this.uploadsDir, filename);
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Failed to remove artwork image:', error);
      throw new Error('Failed to remove image');
    }
  }

  // Get common artwork locations for dropdown
  getCommonLocations(): string[] {
    return [
      'Front Counter',
      'Storage Room A',
      'Storage Room B', 
      'Work Station 1',
      'Work Station 2',
      'Work Station 3',
      'Framing Area',
      'Mat Cutting Station',
      'Glass Storage',
      'Customer Vehicle',
      'Shipping Area',
      'Office',
      'Archive Storage'
    ];
  }
}

export const artworkManager = new ArtworkManager();