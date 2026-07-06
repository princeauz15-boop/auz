"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Settings, Plus, Trash2, Loader2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  officeStartTime: z.string().min(1, "Start time is required"),
  officeEndTime: z.string().min(1, "End time is required"),
  standardWorkHours: z.string().min(1, "Working hours required"),
  graceTimeMinutes: z.string().min(1, "Grace time required"),
  halfDayHours: z.string().min(1, "Half day hours required"),
  weeklyOff: z.string().min(1, "Weekly off required"),
});

type SettingsForm = z.infer<typeof settingsSchema>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  type: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Saturday", "Sunday"]);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", description: "", type: "public" });
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsForm>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    fetchSettings();
    fetchHolidays();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (data.settings) {
      const s = data.settings;
      reset({
        companyName: s.companyName,
        officeStartTime: s.officeStartTime,
        officeEndTime: s.officeEndTime,
        standardWorkHours: s.standardWorkHours.toString(),
        graceTimeMinutes: s.graceTimeMinutes.toString(),
        halfDayHours: s.halfDayHours.toString(),
        weeklyOff: s.weeklyOff,
      });
      setSelectedDays(s.weeklyOff.split(",").map((d: string) => d.trim()));
    }
    setLoading(false);
  };

  const fetchHolidays = async () => {
    const res = await fetch(`/api/admin/holidays?year=${new Date().getFullYear()}`);
    const data = await res.json();
    setHolidays(data.holidays || []);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onSubmit = async (data: SettingsForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, weeklyOff: selectedDays.join(",") }),
      });
      if (res.ok) {
        toast({ title: "Settings saved successfully!" });
      } else {
        toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      toast({ title: "Error", description: "Holiday name and date are required", variant: "destructive" });
      return;
    }
    setHolidayLoading(true);
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHoliday),
      });
      if (res.ok) {
        toast({ title: "Holiday added!" });
        setNewHoliday({ name: "", date: "", description: "", type: "public" });
        fetchHolidays();
      }
    } finally {
      setHolidayLoading(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    const res = await fetch(`/api/admin/holidays?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Holiday deleted" });
      fetchHolidays();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Company & Work Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <CardTitle>Company & Work Schedule</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
              <Input {...register("companyName")} placeholder="Your Company Name" />
              {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Office Start Time</label>
                <Input {...register("officeStartTime")} type="time" />
                {errors.officeStartTime && <p className="text-red-500 text-xs mt-1">{errors.officeStartTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Office End Time</label>
                <Input {...register("officeEndTime")} type="time" />
                {errors.officeEndTime && <p className="text-red-500 text-xs mt-1">{errors.officeEndTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standard Working Hours</label>
                <Input {...register("standardWorkHours")} type="number" step="0.5" min="1" max="24" />
                {errors.standardWorkHours && <p className="text-red-500 text-xs mt-1">{errors.standardWorkHours.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grace Time (minutes)</label>
                <Input {...register("graceTimeMinutes")} type="number" min="0" max="60" />
                {errors.graceTimeMinutes && <p className="text-red-500 text-xs mt-1">{errors.graceTimeMinutes.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Half Day Hours</label>
                <Input {...register("halfDayHours")} type="number" step="0.5" min="1" max="12" />
                {errors.halfDayHours && <p className="text-red-500 text-xs mt-1">{errors.halfDayHours.message}</p>}
              </div>
            </div>

            {/* Weekly Off */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weekly Off Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      selectedDays.includes(day)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Selected: {selectedDays.join(", ") || "None"}</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Holiday Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <CardTitle>Holiday Management ({new Date().getFullYear()})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Holiday Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Input
              placeholder="Holiday name"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
            />
            <Input
              placeholder="Description (optional)"
              value={newHoliday.description}
              onChange={(e) => setNewHoliday((p) => ({ ...p, description: e.target.value }))}
            />
            <Button onClick={addHoliday} disabled={holidayLoading}>
              {holidayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </Button>
          </div>

          {/* Holiday List */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No holidays added for {new Date().getFullYear()}</p>
              </div>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{h.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(h.date)}{h.description && ` • ${h.description}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${h.type === "public" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {h.type}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteHoliday(h.id)}
                      className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 w-7 h-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
