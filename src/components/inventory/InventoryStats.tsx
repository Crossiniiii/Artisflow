import React from 'react';
import { ShoppingBag, CheckCircle2, Clock, ArrowRightLeft } from 'lucide-react';

interface InventoryInsights {
  totalItems: number;
  availableCount: number;
  availableValue: number;
  reservedCount: number;
  inTransitCount: number;
  soldCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

interface InventoryStatsProps {
  inventoryInsights: InventoryInsights;
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({ inventoryInsights }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Items (Current View)
          </span>
          <ShoppingBag className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-2xl font-extrabold text-slate-900">
          {inventoryInsights.totalItems.toLocaleString()}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          After all filters and search are applied.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Available Inventory
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-extrabold text-slate-900">
          {inventoryInsights.availableCount.toLocaleString()}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          ₱{inventoryInsights.availableValue.toLocaleString()} total list value.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Reserved / In Transit
          </span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-lg font-extrabold text-slate-900">
          {inventoryInsights.reservedCount.toLocaleString()} Reserved
        </div>
        <div className="text-xs text-slate-600 mt-1">
          {inventoryInsights.inTransitCount.toLocaleString()} marked as in transit.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Sold / Delivered
          </span>
          <ArrowRightLeft className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-lg font-extrabold text-slate-900">
          {inventoryInsights.soldCount.toLocaleString()} Sold
        </div>
        <div className="text-xs text-slate-600 mt-1">
          {inventoryInsights.deliveredCount.toLocaleString()} Delivered,{' '}
          {inventoryInsights.cancelledCount.toLocaleString()} Cancelled.
        </div>
      </div>
    </div>
  );
};
