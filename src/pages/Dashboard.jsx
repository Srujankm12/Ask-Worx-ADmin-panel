import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import StatCard from '../components/StatCard';
import { getStats, getLeads } from '../api';

import { UserPlus, PhoneCall, Users, MessageSquare, Clock3 } from 'lucide-react';

import { format } from 'date-fns';
import { formatSlug } from '../utils';

// Status → color mapping, inline. Blue = new/in progress, amber = called
// (pending follow-up), green = converted — this is the single place status
// meaning is defined for this page.
const statusConfig = {
  new: { dot: 'bg-primary', badge: 'bg-primary-light text-primary', label: 'New' },
  called: { dot: 'bg-warning', badge: 'bg-warning-light text-warning', label: 'Called' },
  in_progress: { dot: 'bg-primary', badge: 'bg-primary-light text-primary', label: 'In progress' },
  converted: { dot: 'bg-success', badge: 'bg-success-light text-success', label: 'Converted' },
};

const EMPTY_STATS = {
  total_contacts: 0,
  total_leads: 0,
  pending_callbacks: 0,
  new_leads: 0,
  total_messages: 0,
};

const Dashboard = () => {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leadsRes] = await Promise.all([
          getStats(),
          getLeads({ limit: 10, offset: 0 }),
        ]);

        setStats(statsRes.data || EMPTY_STATS);

        const leadsArray = leadsRes.data?.data || leadsRes.data || [];
        setRecentLeads(Array.isArray(leadsArray) ? leadsArray.slice(0, 10) : []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-border border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6"
    >
      {/* STATS — the CRM metrics your team lead wants visible immediately */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="New Leads" value={stats.new_leads} icon={UserPlus} color="primary" />
        <StatCard label="Pending Callbacks" value={stats.pending_callbacks} icon={PhoneCall} color="warning" />
        <StatCard label="Total Contacts" value={stats.total_contacts} icon={Users} color="slate600" />
        <StatCard label="Messages" value={stats.total_messages} icon={MessageSquare} color="slate400" />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* RECENT LEADS */}
        <div className="xl:col-span-2 bg-white border border-border rounded-lg shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary">Recent Leads</h2>
            <button
              type="button"
              className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary">Lead</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary">Contact</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-text-secondary text-right">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {recentLeads.map((lead, index) => {
                  const config = statusConfig[lead.status] || statusConfig.new;

                  return (
                    <tr key={lead.id || index} className="hover:bg-background transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {(lead.name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {lead.name ? formatSlug(lead.name) : 'Anonymous'}
                            </p>
                            <p className="text-xs text-text-secondary">
                              #{String(lead.id || index + 1).padStart(3, '0')}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-sm text-text-secondary">
                        {lead.company || lead.phone || 'Private'}
                      </td>

                      <td className="px-6 py-3.5">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-right text-xs text-text-secondary whitespace-nowrap">
                        {lead.created_at
                          ? format(new Date(lead.created_at), 'dd MMM, hh:mm a')
                          : '--'}
                      </td>
                    </tr>
                  );
                })}

                {recentLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-text-primary">No leads yet</p>
                      <p className="text-xs text-text-secondary mt-1">
                        New leads will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PERFORMANCE */}
        <div className="bg-white border border-border rounded-lg shadow-card p-6">
          <h2 className="text-base font-semibold text-text-primary mb-6">Performance</h2>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Bot efficiency</span>
              <span className="text-sm font-semibold text-text-primary">94%</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '94%' }} />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Response speed</span>
              <span className="text-sm font-semibold text-text-primary">0.8s</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: '88%' }} />
            </div>
          </div>

          <div className="pt-5 border-t border-border flex items-center gap-3">
            <Clock3 className="w-4 h-4 text-text-secondary" />
            <div>
              <p className="text-xs text-text-secondary">Data refresh</p>
              <p className="text-sm font-medium text-text-primary">Every 30 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;