import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash, Image as ImageIcon, Upload, X, MagnifyingGlass, DotsThree, PencilSimple, FolderSimple, Spinner } from '@phosphor-icons/react';
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

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter categories by search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.categoryType && cat.categoryType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading design categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Design Categories</h1>
            <p className="text-sm text-muted-foreground">{categories.length} categories</p>
          </div>
        </div>
        <Button onClick={handleAddCategory} className="bg-[#6A64F2] hover:bg-[#5b55e0]">
          <Plus size={18} className="mr-1" />
          <span className="hidden sm:inline">New Category</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-1">
          {/* Search Bar */}
          <div className="relative mb-4">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories Grid */}
          <div
            className="rounded-xl border-2 p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #e0e7ff 100%)',
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            <h3 className="text-sm font-semibold text-gray-800">
              {searchTerm ? `Search Results (${filteredCategories.length})` : `Categories (${filteredCategories.length})`}
            </h3>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderSimple size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{searchTerm ? 'No categories found' : 'No categories yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCategories.map((category, index) => (
                  <div
                    key={category.id}
                    onClick={() => handleSelectCategory(category)}
                    className={`rounded-xl border-2 hover:shadow-lg transition-all p-3 cursor-pointer w-full flex flex-row gap-3 shadow-sm animate-on-load animate-fade-slide-up stagger-${(index % 6) + 1}`}
                    style={{
                      background: selectedCategory?.id === category.id
                        ? 'linear-gradient(135deg, #6A64F2 0%, #7c3aed 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)',
                      borderColor: selectedCategory?.id === category.id ? '#5b55e0' : '#6A64F2',
                      boxShadow: selectedCategory?.id === category.id
                        ? '0 4px 12px -2px rgba(106, 100, 242, 0.4)'
                        : '0 4px 12px -2px rgba(106, 100, 242, 0.2), 0 2px 6px -2px rgba(106, 100, 242, 0.15)',
                    }}
                  >
                    {/* Left: Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm font-bold"
                      style={{
                        background: selectedCategory?.id === category.id
                          ? 'rgba(255,255,255,0.2)'
                          : 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                      }}
                    >
                      {getInitials(category.name)}
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${selectedCategory?.id === category.id ? 'text-white' : 'text-gray-900'}`}>
                        {category.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`text-[9px] px-1.5 py-0 capitalize ${
                            selectedCategory?.id === category.id
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-purple-100 text-purple-700 border-purple-200'
                          }`}
                          variant="outline"
                        >
                          {DESIGN_CATEGORY_OPTIONS.find(o => o.value === category.categoryType)?.label || category.categoryType}
                        </Badge>
                        <span className={`text-[10px] ${selectedCategory?.id === category.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {category.images.length} image(s)
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${selectedCategory?.id === category.id ? 'text-white hover:bg-white/20' : ''}`}
                          >
                            <DotsThree size={20} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                            <PencilSimple size={16} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteCategoryId(category.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Images Grid */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl border-2 overflow-hidden"
            style={{
              borderColor: 'rgba(196, 181, 253, 0.5)',
            }}
          >
            {selectedCategory && (
              <div
                className="py-3 px-4 border-b flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)', borderColor: 'rgba(196, 181, 253, 0.5)' }}
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Images: {selectedCategory.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedCategory.images.length} design(s)</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="bg-[#6A64F2] hover:bg-[#5b55e0]"
                >
                  <Upload size={16} className="mr-1" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            )}
            <div className="p-4" style={{ background: '#FAF8FF' }}>
              {!selectedCategory ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon size={64} className="mx-auto mb-3 opacity-30" />
                  <p>Select a category to view images</p>
                </div>
              ) : selectedCategory.images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon size={64} className="mx-auto mb-3 opacity-30" />
                  <p>No images in this category</p>
                  <p className="text-sm mt-1">Click "Upload" to add designs</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedCategory.images.map(image => (
                    <div key={image.id} className="relative group">
                      <div
                        className="aspect-square rounded-xl overflow-hidden border-2"
                        style={{ borderColor: '#6A64F2', background: '#fff' }}
                      >
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
                      <p className="text-xs font-bold mt-1" style={{ color: '#6A64F2' }}>{image.designCode || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground truncate">{image.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
