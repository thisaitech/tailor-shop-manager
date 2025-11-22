import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash, Image as ImageIcon, Upload, FolderOpen, X } from '@phosphor-icons/react';
import {
  DesignCategory,
  DesignImage,
  DesignCategoryType,
  DESIGN_CATEGORY_OPTIONS,
  createDesignCategory,
  getDesignCategoriesByCompany,
  updateDesignCategory,
  deleteDesignCategory,
  uploadImageToCategory,
  deleteImageFromCategory,
} from '@/lib/firestore/designCategoryService';
import { getCompanyProfile } from '@/lib/firestore/companyService';

interface DesignManagementProps {
  onBack: () => void;
}

export function DesignManagement({ onBack }: DesignManagementProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');

  // Category form state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DesignCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<DesignCategoryType>('shirt');

  // Selected category for viewing/uploading images
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory | null>(null);

  // Delete confirmation
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteImage, setDeleteImage] = useState<{ categoryId: string; image: DesignImage } | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New category with images state
  const [newCategoryImages, setNewCategoryImages] = useState<File[]>([]);
  const [newCategoryImagePreviews, setNewCategoryImagePreviews] = useState<string[]>([]);
  const newCategoryFileInputRef = useRef<HTMLInputElement>(null);

  // Load categories
  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get company profile
      const company = await getCompanyProfile(user.id);
      if (company) {
        setCompanyId(company.id);
        const cats = await getDesignCategoriesByCompany(company.id);

        // Deduplicate categories by ID (keep most recent)
        const uniqueCats = cats.reduce((acc, cat) => {
          const existing = acc.find(c => c.id === cat.id);
          if (!existing) {
            acc.push(cat);
          } else {
            // Keep the one with more recent updatedAt
            const existingIndex = acc.indexOf(existing);
            if (cat.updatedAt > existing.updatedAt) {
              acc[existingIndex] = cat;
            }
          }
          return acc;
        }, [] as typeof cats);

        setCategories(uniqueCats);

        if (uniqueCats.length !== cats.length) {
          console.warn(`[DesignManagement] Removed ${cats.length - uniqueCats.length} duplicate categories`);
        }
      }
    } catch (error) {
      console.error('Error loading design categories:', error);
      toast.error('Failed to load design categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType('shirt');
    setNewCategoryImages([]);
    setNewCategoryImagePreviews([]);
    setShowCategoryDialog(true);
  };

  // Handle new category image selection
  const handleNewCategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      }
    });

    setNewCategoryImages(prev => [...prev, ...newFiles]);
    setNewCategoryImagePreviews(prev => [...prev, ...newPreviews]);

    // Reset file input
    if (newCategoryFileInputRef.current) {
      newCategoryFileInputRef.current.value = '';
    }
  };

  // Remove image from new category
  const handleRemoveNewCategoryImage = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(newCategoryImagePreviews[index]);
    setNewCategoryImages(prev => prev.filter((_, i) => i !== index));
    setNewCategoryImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditCategory = (category: DesignCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryType(category.categoryType || 'shirt');
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (!companyId || !user?.id) {
      toast.error('Company profile not found');
      return;
    }

    setUploading(true);
    try {
      if (editingCategory) {
        // Update existing
        await updateDesignCategory(editingCategory.id, categoryName.trim());
        setCategories(cats =>
          cats.map(c => c.id === editingCategory.id ? { ...c, name: categoryName.trim(), categoryType } : c)
        );
        toast.success('Category updated successfully');
      } else {
        // Create new category
        const newCategory = await createDesignCategory(categoryName.trim(), categoryType, companyId, user.id);

        // Upload images if any
        if (newCategoryImages.length > 0) {
          const uploadedImages: DesignImage[] = [];

          for (const file of newCategoryImages) {
            try {
              const image = await uploadImageToCategory(newCategory.id, file, companyId);
              uploadedImages.push(image);
            } catch (err) {
              console.error('Error uploading image:', err);
            }
          }

          // Update category with uploaded images
          newCategory.images = uploadedImages;
          toast.success(`Category created with ${uploadedImages.length} image(s)`);
        } else {
          toast.success('Category created successfully');
        }

        setCategories(cats => [newCategory, ...cats]);

        // Clean up preview URLs
        newCategoryImagePreviews.forEach(url => URL.revokeObjectURL(url));
      }

      setShowCategoryDialog(false);
      setCategoryName('');
      setCategoryType('shirt');
      setEditingCategory(null);
      setNewCategoryImages([]);
      setNewCategoryImagePreviews([]);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    try {
      await deleteDesignCategory(deleteCategoryId);
      setCategories(cats => cats.filter(c => c.id !== deleteCategoryId));
      if (selectedCategory?.id === deleteCategoryId) {
        setSelectedCategory(null);
      }
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setDeleteCategoryId(null);
    }
  };

  const handleSelectCategory = (category: DesignCategory) => {
    setSelectedCategory(category);
  };

  const handleUploadClick = () => {
    if (!selectedCategory) {
      toast.error('Please select a category first');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedCategory || !companyId) return;

    setUploading(true);
    try {
      const uploadedImages: DesignImage[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        const image = await uploadImageToCategory(selectedCategory.id, file, companyId);
        uploadedImages.push(image);
      }

      // Update selected category with new images
      setSelectedCategory(prev => prev ? {
        ...prev,
        images: [...prev.images, ...uploadedImages]
      } : null);

      // Update categories list
      setCategories(cats =>
        cats.map(c => c.id === selectedCategory.id
          ? { ...c, images: [...c.images, ...uploadedImages] }
          : c
        )
      );

      toast.success(`${uploadedImages.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteImage) return;

    try {
      await deleteImageFromCategory(deleteImage.categoryId, deleteImage.image);

      // Update selected category
      if (selectedCategory?.id === deleteImage.categoryId) {
        setSelectedCategory(prev => prev ? {
          ...prev,
          images: prev.images.filter(img => img.id !== deleteImage.image.id)
        } : null);
      }

      // Update categories list
      setCategories(cats =>
        cats.map(c => c.id === deleteImage.categoryId
          ? { ...c, images: c.images.filter(img => img.id !== deleteImage.image.id) }
          : c
        )
      );

      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    } finally {
      setDeleteImage(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Design Categories</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold">Design Categories</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              {/* Add Category Button */}
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="ghost" onClick={handleAddCategory} className="h-8 w-8 p-0">
                  <Plus size={18} />
                </Button>
              </div>
              {categories.length > 0 && (
                <div className="space-y-1">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      onClick={() => handleSelectCategory(category)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCategory?.id === category.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          <p className={`text-xs ${
                            selectedCategory?.id === category.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            {DESIGN_CATEGORY_OPTIONS.find(o => o.value === category.categoryType)?.label || category.categoryType} • {category.images.length} image(s)
                          </p>
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEditCategory(category)}
                          >
                            <span className="sr-only">Edit</span>
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => setDeleteCategoryId(category.id)}
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Images Grid */}
        <div className="lg:col-span-2">
          <Card>
            {selectedCategory && (
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Images: {selectedCategory.name}
                  </CardTitle>
                  <Button size="sm" onClick={handleUploadClick} disabled={uploading}>
                    <Upload size={16} className="mr-1" />
                    {uploading ? 'Uploading...' : 'Upload Images'}
                  </Button>
                </div>
              </CardHeader>
            )}
            <CardContent className="p-4">
              {!selectedCategory ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon size={64} className="mx-auto mb-3 opacity-30" />
                  <p>Select a category to view images</p>
                </div>
              ) : selectedCategory.images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon size={64} className="mx-auto mb-3 opacity-30" />
                  <p>No images in this category</p>
                  <p className="text-sm mt-1">Click "Upload Images" to add designs</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedCategory.images.map(image => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteImage({ categoryId: selectedCategory.id, image })}
                      >
                        <X size={12} />
                      </Button>
                      <p className="text-xs font-medium text-primary mt-1">{image.designCode || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground truncate">{image.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'New Design Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                placeholder="e.g., Wedding Designs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryType">Design Category *</Label>
              <Select value={categoryType} onValueChange={(value) => setCategoryType(value as DesignCategoryType)}>
                <SelectTrigger id="categoryType">
                  <SelectValue placeholder="Select category type" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_CATEGORY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload - only for new categories */}
            {!editingCategory && (
              <div className="space-y-2">
                <Label>Upload Design Images</Label>
                <input
                  ref={newCategoryFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleNewCategoryImageSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => newCategoryFileInputRef.current?.click()}
                  className="w-full"
                  disabled={uploading}
                >
                  <Upload size={16} className="mr-2" />
                  Select Images
                </Button>
                <p className="text-xs text-muted-foreground">
                  Each image will get an auto-generated Design Code (D001, D002, etc.)
                </p>

                {/* Image Previews */}
                {newCategoryImagePreviews.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs text-muted-foreground">
                      Selected Images ({newCategoryImages.length})
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {newCategoryImagePreviews.map((previewUrl, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                            <img
                              src={previewUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveNewCategoryImage(index)}
                          >
                            <X size={12} />
                          </Button>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {newCategoryImages[index]?.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={uploading}>
              {uploading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category and all its images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Image Confirmation */}
      <AlertDialog open={!!deleteImage} onOpenChange={() => setDeleteImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this image. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
