import { useMemo, useState } from 'react';
import { Filter, FileSpreadsheet, FileDown, X, Settings2 } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomReportStaff } from '@/hooks/useCustomReport';
import { useColleges } from '@/hooks/useColleges';
import { useDepartments } from '@/hooks/useStaff';
import { Staff, STAFF_CATEGORIES, STAFF_STATUSES, EDUCATION_LEVELS, ACADEMIC_RANKS } from '@/types/staff';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ALL_COLUMNS, exportCustomReportXlsx, exportCustomReportPdf } from '@/lib/customReportExport';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

type TriState = 'any' | 'yes' | 'no';

const ALLOWED_ROLES = ['system_admin', 'avd', 'hr', 'management'];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--secondary))',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

const GROUPABLE: { key: keyof Staff | 'department' | 'college'; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'current_status', label: 'Status' },
  { key: 'sex', label: 'Sex' },
  { key: 'education_level', label: 'Education Level' },
  { key: 'academic_rank', label: 'Academic Rank' },
  { key: 'department', label: 'Department' },
  { key: 'college', label: 'College' },
  { key: 'marital_status', label: 'Marital Status' },
];

const calcAge = (dob?: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const CustomReports = () => {
  const { role } = useAuth();
  const { data: staffData, isLoading } = useCustomReportStaff();
  const { data: colleges } = useColleges();
  const { data: departments } = useDepartments();

  // Filter state
  const [collegeId, setCollegeId] = useState<string>('all');
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [sex, setSex] = useState<string>('all');
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [ranks, setRanks] = useState<string[]>([]);
  const [specialization, setSpecialization] = useState('');
  const [hdp, setHdp] = useState<TriState>('any');
  const [mc, setMc] = useState<TriState>('any');
  const [elip, setElip] = useState<TriState>('any');
  const [maritalStatus, setMaritalStatus] = useState<string>('all');
  const [ageMin, setAgeMin] = useState<string>('');
  const [ageMax, setAgeMax] = useState<string>('');
  const [employedFrom, setEmployedFrom] = useState<string>('');
  const [employedTo, setEmployedTo] = useState<string>('');
  const [search, setSearch] = useState('');

  // Display
  const [groupBy, setGroupBy] = useState<string>('category');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    ALL_COLUMNS.slice(0, 10).map((c) => c.key)
  );

  const departmentsForCollege = useMemo(() => {
    if (collegeId === 'all') return departments || [];
    return (departments || []).filter((d: any) => d.college_id === collegeId);
  }, [departments, collegeId]);

  const filtered = useMemo(() => {
    if (!staffData) return [];
    return staffData.filter((s) => {
      if (collegeId !== 'all') {
        const dCollege = (s.departments as any)?.college_id;
        if (dCollege !== collegeId) return false;
      }
      if (departmentId !== 'all' && s.department_id !== departmentId) return false;
      if (category !== 'all' && s.category !== category) return false;
      if (status !== 'all' && s.current_status !== status) return false;
      if (sex !== 'all' && s.sex !== sex) return false;
      if (educationLevels.length && !educationLevels.includes(s.education_level)) return false;
      if (ranks.length && !ranks.includes(s.academic_rank || '')) return false;
      if (specialization && !(s.specialization || '').toLowerCase().includes(specialization.toLowerCase())) return false;
      if (hdp !== 'any' && Boolean(s.hdp_certified) !== (hdp === 'yes')) return false;
      if (mc !== 'any' && Boolean(s.mc_certified) !== (mc === 'yes')) return false;
      if (elip !== 'any' && Boolean(s.elip_certified) !== (elip === 'yes')) return false;
      if (maritalStatus !== 'all' && (s.marital_status || '') !== maritalStatus) return false;

      const age = calcAge(s.date_of_birth);
      if (ageMin && (age === null || age < parseInt(ageMin))) return false;
      if (ageMax && (age === null || age > parseInt(ageMax))) return false;

      if (employedFrom && (!s.employment_date_astu || s.employment_date_astu < employedFrom)) return false;
      if (employedTo && (!s.employment_date_astu || s.employment_date_astu > employedTo)) return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !(s.full_name || '').toLowerCase().includes(q) &&
          !(s.staff_id || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [
    staffData, collegeId, departmentId, category, status, sex, educationLevels, ranks,
    specialization, hdp, mc, elip, maritalStatus, ageMin, ageMax, employedFrom, employedTo, search,
  ]);

  // Aggregations
  const summary = useMemo(() => {
    const total = filtered.length;
    const male = filtered.filter((s) => s.sex === 'M').length;
    const female = filtered.filter((s) => s.sex === 'F').length;
    const onDuty = filtered.filter((s) => (s.current_status || '').toLowerCase() === 'on duty').length;
    const hdpCount = filtered.filter((s) => s.hdp_certified).length;
    const mcCount = filtered.filter((s) => s.mc_certified).length;
    const elipCount = filtered.filter((s) => s.elip_certified).length;
    return { total, male, female, onDuty, hdpCount, mcCount, elipCount };
  }, [filtered]);

  const groupData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      let key: string;
      if (groupBy === 'department') key = s.departments?.name || 'N/A';
      else if (groupBy === 'college') key = s.departments?.college_name || s.college_name || 'N/A';
      else key = ((s as any)[groupBy] || 'N/A').toString();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, groupBy]);

  const tableColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key)),
    [selectedColumns]
  );

  const resetFilters = () => {
    setCollegeId('all');
    setDepartmentId('all');
    setCategory('all');
    setStatus('all');
    setSex('all');
    setEducationLevels([]);
    setRanks([]);
    setSpecialization('');
    setHdp('any');
    setMc('any');
    setElip('any');
    setMaritalStatus('all');
    setAgeMin('');
    setAgeMax('');
    setEmployedFrom('');
    setEmployedTo('');
    setSearch('');
  };

  const handleExportXlsx = () => {
    if (!filtered.length) return toast.error('No records to export');
    exportCustomReportXlsx(filtered, tableColumns, 'ASTU Custom Staff Report');
    toast.success('Excel exported');
  };

  const handleExportPdf = () => {
    if (!filtered.length) return toast.error('No records to export');
    exportCustomReportPdf(filtered, tableColumns, 'ASTU Custom Staff Report');
    toast.success('PDF exported');
  };

  const toggleArr = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Custom Reports</h1>
            <p className="text-muted-foreground">Build flexible reports across any combination of criteria.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportXlsx}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button onClick={handleExportPdf}>
              <FileDown className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" /> Filters
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
            <CardDescription>Combine any criteria below — results update live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Search</Label>
                <Input placeholder="Name or staff ID" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div>
                <Label>College</Label>
                <Select value={collegeId} onValueChange={(v) => { setCollegeId(v); setDepartmentId('all'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All colleges</SelectItem>
                    {colleges?.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departmentsForCollege.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {STAFF_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STAFF_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sex</Label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Both</SelectItem>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marital Status</Label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Specialization contains</Label>
                <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="e.g. computer" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">Education Level</Label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVELS.map((e) => (
                    <Badge
                      key={e}
                      variant={educationLevels.includes(e) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArr(educationLevels, e, setEducationLevels)}
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Academic Rank</Label>
                <div className="flex flex-wrap gap-2">
                  {ACADEMIC_RANKS.map((r) => (
                    <Badge
                      key={r}
                      variant={ranks.includes(r) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArr(ranks, r, setRanks)}
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                ['HDP', hdp, setHdp],
                ['MC', mc, setMc],
                ['ELIP', elip, setElip],
              ] as const).map(([label, val, setter]) => (
                <div key={label}>
                  <Label>{label} Certification</Label>
                  <Select value={val} onValueChange={(v) => (setter as any)(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="yes">Certified</SelectItem>
                      <SelectItem value="no">Not certified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Age min</Label>
                <Input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="e.g. 25" />
              </div>
              <div>
                <Label>Age max</Label>
                <Input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="e.g. 60" />
              </div>
              <div>
                <Label>Employed from</Label>
                <Input type="date" value={employedFrom} onChange={(e) => setEmployedFrom(e.target.value)} />
              </div>
              <div>
                <Label>Employed to</Label>
                <Input type="date" value={employedTo} onChange={(e) => setEmployedTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Male', value: summary.male },
            { label: 'Female', value: summary.female },
            { label: 'On Duty', value: summary.onDuty },
            { label: 'HDP', value: summary.hdpCount },
            { label: 'MC', value: summary.mcCount },
            { label: 'ELIP', value: summary.elipCount },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts + Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>{filtered.length} record{filtered.length !== 1 ? 's' : ''} matching</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Group by</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GROUPABLE.map((g) => <SelectItem key={g.key} value={g.key as string}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table">
              <TabsList>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="chart">Charts</TabsTrigger>
                <TabsTrigger value="columns"><Settings2 className="h-4 w-4 mr-1" /> Columns</TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-4">
                {isLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="border rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          {tableColumns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={tableColumns.length} className="text-center text-muted-foreground py-8">
                              No matching records
                            </TableCell>
                          </TableRow>
                        ) : filtered.map((s) => (
                          <TableRow key={s.id}>
                            {tableColumns.map((c) => <TableCell key={c.key}>{c.get(s)}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chart" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-80">
                    <h3 className="font-medium mb-2">Distribution by {GROUPABLE.find((g) => g.key === groupBy)?.label}</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={groupData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={80} fontSize={11} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-80">
                    <h3 className="font-medium mb-2">Share</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={groupData} dataKey="value" nameKey="name" outerRadius={100} label>
                          {groupData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="columns" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ALL_COLUMNS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedColumns.includes(c.key)}
                        onCheckedChange={() => toggleArr(selectedColumns, c.key, setSelectedColumns)}
                      />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomReports;
