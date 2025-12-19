import { useState } from 'react';
import { Plus, Search, Filter, Upload } from 'lucide-react';
import Header from '@/components/Header';
import StaffForm from '@/components/StaffForm';
import EditableStaffTable from '@/components/EditableStaffTable';
import CSVImport from '@/components/CSVImport';
import { useStaff, useDepartments } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
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
import { Skeleton } from '@/components/ui/skeleton';

const Staff = () => {
  const { role, profile } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StaffCategory | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffType | null>(null);

  const { data: departments } = useDepartments();
  
  // Department heads only see their department's staff
  const departmentId = role === 'department_head' ? profile?.department_id : undefined;
  
  const { data: staff, isLoading } = useStaff({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    departmentId: departmentId || undefined,
    search: search || undefined,
  });

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedStaff(null);
  };

  const canEdit = role === 'system_admin' || role === 'department_head' || role === 'avd';
  const canDelete = role === 'system_admin' || role === 'department_head' || role === 'avd';
  const canImport = role === 'system_admin' || role === 'department_head' || role === 'avd';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Staff Directory</h1>
            <p className="text-muted-foreground">
              {role === 'department_head' 
                ? `Managing staff for ${departments?.find(d => d.id === profile?.department_id)?.name || 'your department'}`
                : 'Manage all academic staff members'}
            </p>
          </div>
          <div className="flex gap-2">
            {canImport && (
              <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            )}
          </div>
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
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {staff && `Showing ${staff.length} staff member${staff.length !== 1 ? 's' : ''}`}
          {canEdit && <span className="ml-2 text-primary">(Click on any cell to edit)</span>}
        </div>

        {/* Staff Table */}
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <EditableStaffTable
            staff={staff || []}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}

        {/* Staff Form Dialog */}
        <StaffForm
          open={formOpen}
          onClose={handleCloseForm}
          staff={selectedStaff}
          defaultDepartmentId={departmentId || undefined}
        />

        {/* CSV Import Dialog */}
        <CSVImport open={csvImportOpen} onClose={() => setCsvImportOpen(false)} />
      </main>
    </div>
  );
};

export default Staff;
