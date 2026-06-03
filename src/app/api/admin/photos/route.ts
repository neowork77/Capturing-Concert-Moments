import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/photos-data.json');

interface PhotoEntry {
  id: string;
  imgKey: string;
  artist: string;
  event: string;
  venue: string;
  date: string;
  deleted: boolean;
}

interface PhotosData {
  photos: PhotoEntry[];
}

async function readData(): Promise<PhotosData> {
  const raw = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data: PhotosData): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET — return all photos (including deleted, for admin view)
export async function GET() {
  try {
    const data = await readData();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to read photos data:', error);
    return Response.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

// PUT — update metadata for a specific photo
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, artist, event, venue, date } = body;

    if (!id) {
      return Response.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const data = await readData();
    const photoIndex = data.photos.findIndex((p) => p.id === id);

    if (photoIndex === -1) {
      return Response.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Update only provided fields
    if (artist !== undefined) data.photos[photoIndex].artist = artist;
    if (event !== undefined) data.photos[photoIndex].event = event;
    if (venue !== undefined) data.photos[photoIndex].venue = venue;
    if (date !== undefined) data.photos[photoIndex].date = date;

    await writeData(data);
    return Response.json({ success: true, photo: data.photos[photoIndex] });
  } catch (error) {
    console.error('Failed to update photo:', error);
    return Response.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}

// DELETE — soft-delete (hide) a photo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const data = await readData();
    const photoIndex = data.photos.findIndex((p) => p.id === id);

    if (photoIndex === -1) {
      return Response.json({ error: 'Photo not found' }, { status: 404 });
    }

    data.photos[photoIndex].deleted = true;

    await writeData(data);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to hide photo:', error);
    return Response.json({ error: 'Failed to hide photo' }, { status: 500 });
  }
}

// PATCH — restore a deleted photo
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const data = await readData();
    const photoIndex = data.photos.findIndex((p) => p.id === id);

    if (photoIndex === -1) {
      return Response.json({ error: 'Photo not found' }, { status: 404 });
    }

    data.photos[photoIndex].deleted = false;
    await writeData(data);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to restore photo:', error);
    return Response.json({ error: 'Failed to restore photo' }, { status: 500 });
  }
}
