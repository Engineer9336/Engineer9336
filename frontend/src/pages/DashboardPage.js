import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Download,
  CalendarIcon,
  Trash2,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/dashboard/stats`, {
        withCredentials: true,
      });
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params = selectedDate
        ? { date: format(selectedDate, "yyyy-MM-dd") }
        : {};
      const { data } = await axios.get(`${API}/attendance/logs`, {
        params,
        withCredentials: true,
      });
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  }, [selectedDate]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/users`, {
        withCredentials: true,
      });
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
  }, [activeTab, fetchUsers]);

  const handleExport = async () => {
    try {
      const params = selectedDate
        ? `?date=${format(selectedDate, "yyyy-MM-dd")}`
        : "";
      const response = await axios.get(
        `${API}/attendance/export${params}`,
        { withCredentials: true, responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `attendance_${selectedDate ? format(selectedDate, "yyyy-MM-dd") : "all"}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (err) {
      toast.error("Failed to export CSV");
    }
  };

  const handleDeleteUser = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this user? This will also remove their face data.")) return;
    try {
      await axios.delete(`${API}/users/${employeeId}`, {
        withCredentials: true,
      });
      toast.success("User deleted");
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const statCards = stats
    ? [
        {
          label: "Registered Users",
          value: stats.total_users,
          icon: Users,
        },
        {
          label: "Today's Attendance",
          value: stats.today_attendance,
          icon: CalendarCheck,
        },
        {
          label: "Attendance Rate",
          value: `${stats.attendance_rate}%`,
          icon: TrendingUp,
        },
        {
          label: "Total Records",
          value: stats.total_attendance,
          icon: Activity,
        },
      ]
    : [];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of attendance monitoring system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="dashboard-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            Attendance Logs
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            Registered Users
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border border-border" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground">
                        {label}
                      </p>
                      <p className="text-3xl font-black mt-2">{value}</p>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                      <Icon size={20} className="text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {stats?.weekly_data && (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black">
                  Weekly Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.weekly_data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 0,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      name="Attendance"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Logs Tab ─── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2"
                    data-testid="date-filter-btn"
                  >
                    <CalendarIcon size={16} />
                    {selectedDate
                      ? format(selectedDate, "PPP")
                      : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    data-testid="date-calendar"
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  data-testid="clear-date-btn"
                >
                  Clear
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              data-testid="export-csv-btn"
            >
              <Download size={16} />
              Export CSV
            </Button>
          </div>

          <Card className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Name
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Employee ID
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Date
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Time
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Confidence
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, i) => (
                    <TableRow key={i} data-testid={`log-row-${i}`}>
                      <TableCell className="font-medium">
                        {log.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.employee_id}
                      </TableCell>
                      <TableCell>{log.date}</TableCell>
                      <TableCell>{log.time}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.confidence < 40 ? "default" : "secondary"
                          }
                        >
                          {log.confidence?.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── Users Tab ─── */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Card className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Name
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Employee ID
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Face Samples
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Registered On
                  </TableHead>
                  <TableHead className="font-bold text-xs tracking-wider uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No users registered yet
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u, i) => (
                    <TableRow key={i} data-testid={`user-row-${i}`}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {u.employee_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.face_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.created_at?.split("T")[0]}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(u.employee_id)}
                          data-testid={`delete-user-${u.employee_id}`}
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
