import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import Header from '@/components/Header';
import StaffTable from '@/components/StaffTable';
import StaffForm from '@/components/StaffForm';
import { useStaff, useDepartments, useDeleteStaff } from '@/hooks/useStaff';
import { Staff as StaffType, STAFF_CATEGORIES, StaffCategory } from '@/types/staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';

const Staff = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StaffCategory | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: departments } = useDepartments();
  const { data: staff, isLoading } = useStaff({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    departmentId: departmentFilter === 'all' ? undefined : departmentFilter,
    search: search || undefined,
  });
  const deleteStaff = useDeleteStaff();

  const handleEdit = (staff: StaffType) => {
    setSelectedStaff(staff);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteStaff.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedStaff(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Staff Directory</h1>
            <p className="text-muted-foreground">Manage all academic staff members</p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border p-4 mb-6 shadow-card animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as StaffCategory | 'all')}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {STAFF_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {staff && `Showing ${staff.length} staff member${staff.length !== 1 ? 's' : ''}`}
        </div>

        {/* Staff Table */}
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <StaffTable
            staff={staff || []}
            showActions
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        {/* Staff Form Dialog */}
        <StaffForm
          open={formOpen}
          onClose={handleCloseForm}
          staff={selectedStaff}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this staff member? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Staff;
