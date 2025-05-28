import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ImageIcon, Upload, X, MapPin, Package, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ArtworkManagerProps {
  orderId: string;
  artworkImages?: string[];
  artworkLocation?: string;
  artworkReceived?: boolean;
  artworkReceivedDate?: string;
}

export default function ArtworkManager({ 
  orderId, 
  artworkImages = [], 
  artworkLocation,
  artworkReceived = false,
  artworkReceivedDate 
}: ArtworkManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [location, setLocation] = useState(artworkLocation || "");

  // Get common locations
  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/artwork/locations']
  });

  // Upload artwork image mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('artwork', file);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/artwork/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Image Uploaded",
        description: "Artwork image has been uploaded successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setSelectedFiles(null);
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload artwork image",
        variant: "destructive"
      });
    }
  });

  // Update location mutation
  const locationMutation = useMutation({
    mutationFn: async (newLocation: string) => {
      const response = await fetch(`/api/orders/${orderId}/artwork/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newLocation })
      });
      if (!response.ok) throw new Error('Failed to update location');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Updated",
        description: "Artwork location has been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Update received status mutation
  const receivedMutation = useMutation({
    mutationFn: async (received: boolean) => {
      const response = await fetch(`/api/orders/${orderId}/artwork/received`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Artwork received status has been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Remove image mutation
  const removeMutation = useMutation({
    mutationFn: (imageUrl: string) => 
      fetch(`/api/orders/${orderId}/artwork/${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({
        title: "Image Removed",
        description: "Artwork image has been removed"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles[0]);
    }
  };

  const handleLocationUpdate = (newLocation: string) => {
    setLocation(newLocation);
    locationMutation.mutate(newLocation);
  };

  const handleReceivedToggle = (received: boolean) => {
    receivedMutation.mutate(received);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Artwork Management</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Artwork Received Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Artwork Received</Label>
            <p className="text-xs text-muted-foreground">
              Mark when customer artwork has been received
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={artworkReceived}
              onCheckedChange={handleReceivedToggle}
              disabled={receivedMutation.isPending}
            />
            {artworkReceived && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {artworkReceivedDate ? new Date(artworkReceivedDate).toLocaleDateString() : 'Today'}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Artwork Location */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            Artwork Location
          </Label>
          <Select value={location} onValueChange={handleLocationUpdate}>
            <SelectTrigger>
              <SelectValue placeholder="Select artwork location..." />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc: string) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {location && (
            <Badge variant="outline" className="w-fit">
              <Package className="h-3 w-3 mr-1" />
              {location}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Image Upload */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Upload Artwork Images</Label>
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
            />
            <Button 
              onClick={handleUpload}
              disabled={!selectedFiles || uploadMutation.isPending}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>

        {/* Artwork Images Gallery */}
        {artworkImages.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Artwork Images</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {artworkImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Artwork ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMutation.mutate(imageUrl)}
                    disabled={removeMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {artworkImages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No artwork images uploaded yet</p>
            <p className="text-xs">Upload images to keep track of customer artwork</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}