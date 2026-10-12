import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import Header from '@/components/Header';
import { useArchivedStaff, useRestoreStaff } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const StaffArchive = () => {
  const { role } = useAuth();
  const { data = [], isLoading } = useArchivedStaff();
  const restore = useRestoreStaff();
  const [search, setSearch] = useState('');
  const rows = data.filter((s) =>
    `${s.full_name} ${s.staff_id ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Staff Archive</h1>
          <p className="text-muted-foreground">Removed staff kept for future reference and follow up ({data.length})</p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? <Skeleton className="h-64 w-full" /> : (
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead><TableHead>Full Name</TableHead><TableHead>Sex</TableHead>
                  <TableHead>Department</TableHead><TableHead>Education</TableHead><TableHead>Rank</TableHead>
                  <TableHead>Category</TableHead><TableHead>Phone</TableHead><TableHead>Archived On</TableHead>
                  <TableHead>Archived By</TableHead>{role === 'system_admin' && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No archived staff</TableCell></TableRow>
                )}
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.staff_id}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{s.sex}</TableCell>
                    <TableCell>{s.departments?.name}</TableCell>
                    <TableCell>{s.education_level}</TableCell>
                    <TableCell>{s.academic_rank}</TableCell>
                    <TableCell>{s.category}</TableCell>
                    <TableCell>{s.phone_number}</TableCell>
                    <TableCell>{s.archived_at && new Date(s.archived_at).toLocaleDateString()}</TableCell>
                    <TableCell>{s.archived_by_name}</TableCell>
                    {role === 'system_admin' && (
                      <TableCell>
                        <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(s.id)}>
                          <RotateCcw className="h-4 w-4 mr-1" /> Restore
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffArchive;
