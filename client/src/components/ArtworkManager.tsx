import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ArtworkManagerProps {
  orderId: string;
}

interface ArtworkImage {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
}

export function ArtworkManager({ orderId }: ArtworkManagerProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: images = [], isLoading } = useQuery<ArtworkImage[]>({
    queryKey: [`/api/orders/${orderId}/artwork`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/artwork`);
      if (!response.ok) throw new Error('Failed to fetch artwork');
      return response.json();
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('artwork', file);

      const response = await fetch(`/api/orders/${orderId}/artwork`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/artwork`] });
      toast({
        title: "Upload Successful",
        description: "Artwork image has been uploaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`/api/orders/${orderId}/artwork/${imageId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/artwork`] });
      toast({
        title: "Image Deleted",
        description: "Artwork image has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading artwork...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id={`artwork-upload-${orderId}`}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById(`artwork-upload-${orderId}`)?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-muted-foreground">No artwork images uploaded</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image) => (
            <Card key={image.id}>
              <CardContent className="p-4">
                <div className="relative">
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => deleteMutation.mutate(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {image.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(image.uploadedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}