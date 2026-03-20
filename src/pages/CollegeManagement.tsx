import { useState } from 'react';
import { Plus, Edit, Trash2, Building2, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useColleges, useCreateCollege, useUpdateCollege, useDeleteCollege, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/useColleges';
import { useDepartments } from '@/hooks/useStaff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const CollegeManagement = () => {
  const { role } = useAuth();
  const { data: colleges, isLoading: loadingColleges } = useColleges();
  const { data: departments, isLoading: loadingDepts } = useDepartments();

  const createCollege = useCreateCollege();
  const updateCollege = useUpdateCollege();
  const deleteCollege = useDeleteCollege();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [expandedColleges, setExpandedColleges] = useState<Set<string>>(new Set());
  const [collegeDialog, setCollegeDialog] = useState(false);
  const [deptDialog, setDeptDialog] = useState(false);
  const [editingCollege, setEditingCollege] = useState<{ id: string; name: string; code: string } | null>(null);
  const [editingDept, setEditingDept] = useState<{ id: string; name: string; code: string; college_id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'college' | 'department'; id: string; name: string } | null>(null);
  const [collegeForm, setCollegeForm] = useState({ name: '', code: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', college_id: '' });

  const toggleExpand = (id: string) => {
    setExpandedColleges(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAddCollege = () => {
    setEditingCollege(null);
    setCollegeForm({ name: '', code: '' });
    setCollegeDialog(true);
  };

  const openEditCollege = (c: { id: string; name: string; code: string }) => {
    setEditingCollege(c);
    setCollegeForm({ name: c.name, code: c.code });
    setCollegeDialog(true);
  };

  const handleSaveCollege = () => {
    if (editingCollege) {
      updateCollege.mutate({ id: editingCollege.id, ...collegeForm }, { onSuccess: () => setCollegeDialog(false) });
    } else {
      createCollege.mutate(collegeForm, { onSuccess: () => setCollegeDialog(false) });
    }
  };

  const openAddDept = (collegeId: string) => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '', college_id: collegeId });
    setDeptDialog(true);
  };

  const openEditDept = (d: { id: string; name: string; code: string; college_id: string }) => {
    setEditingDept(d);
    setDeptForm({ name: d.name, code: d.code, college_id: d.college_id });
    setDeptDialog(true);
  };

  const handleSaveDept = () => {
    const college = colleges?.find(c => c.id === deptForm.college_id);
    if (editingDept) {
      updateDepartment.mutate({ id: editingDept.id, ...deptForm, college_name: college?.name || '' }, { onSuccess: () => setDeptDialog(false) });
    } else {
      createDepartment.mutate({ ...deptForm, college_name: college?.name || '' }, { onSuccess: () => setDeptDialog(false) });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'college') {
      deleteCollege.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    } else {
      deleteDepartment.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  if (role !== 'system_admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isLoading = loadingColleges || loadingDepts;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Colleges & Departments</h1>
            <p className="text-muted-foreground">Manage university structure — colleges and their departments/units</p>
          </div>
          <Button onClick={openAddCollege}>
            <Plus className="h-4 w-4 mr-2" />
            Add College
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            {colleges?.map(college => {
              const collegeDepts = departments?.filter(d => (d as any).college_id === college.id) || [];
              const isExpanded = expandedColleges.has(college.id);

              return (
                <Card key={college.id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(college.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground">{college.name}</h3>
                        <p className="text-sm text-muted-foreground">Code: {college.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Badge variant="secondary">{collegeDepts.length} dept{collegeDepts.length !== 1 ? 's' : ''}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => openEditCollege(college)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'college', id: college.id, name: college.name })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Departments / Units</h4>
                        <Button variant="outline" size="sm" onClick={() => openAddDept(college.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Department
                        </Button>
                      </div>
                      {collegeDepts.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-2">No departments yet. Add one to get started.</p>
                      ) : (
                        <div className="space-y-2">
                          {collegeDepts.map(dept => (
                            <div key={dept.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{dept.code}</span>
                                <span className="text-sm text-muted-foreground">— {dept.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditDept({ id: dept.id, name: dept.name, code: dept.code, college_id: college.id })}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: 'department', id: dept.id, name: dept.name })}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {(!colleges || colleges.length === 0) && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No colleges yet. Add your first college to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* College Dialog */}
        <Dialog open={collegeDialog} onOpenChange={setCollegeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">{editingCollege ? 'Edit College' : 'Add College'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>College Name</Label>
                <Input value={collegeForm.name} onChange={e => setCollegeForm({ ...collegeForm, name: e.target.value })} placeholder="e.g. College of Electrical Engineering & Computing" />
              </div>
              <div className="space-y-2">
                <Label>College Code</Label>
                <Input value={collegeForm.code} onChange={e => setCollegeForm({ ...collegeForm, code: e.target.value })} placeholder="e.g. CoEEC" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCollegeDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveCollege} disabled={!collegeForm.name || !collegeForm.code || createCollege.isPending || updateCollege.isPending}>
                {createCollege.isPending || updateCollege.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Department Dialog */}
        <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Software Engineering" />
              </div>
              <div className="space-y-2">
                <Label>Department Code</Label>
                <Input value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. SWEng" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeptDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveDept} disabled={!deptForm.name || !deptForm.code || createDepartment.isPending || updateDepartment.isPending}>
                {createDepartment.isPending || updateDepartment.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteTarget?.type === 'college' ? 'College' : 'Department'}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"?
                {deleteTarget?.type === 'college' && ' This will also delete all departments under this college.'}
                {' '}This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default CollegeManagement;
