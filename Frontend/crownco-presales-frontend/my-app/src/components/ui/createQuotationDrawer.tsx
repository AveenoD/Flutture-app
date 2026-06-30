"use client";

import { useEffect, useState } from "react";
import {
  X,
  Buildings,
  User,
  Phone,
  Envelope,
  ShieldCheck,
  Star,
  Sparkle,
  Shield,
  Plus,
  Trash,
} from "phosphor-react";

interface PriceBreakdownItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

interface QuotationFormData {
  project: string;
  wing: string;
  flatNo: string;
  floor: string;
  reraCarpetArea: string;
  priceBreakdown: PriceBreakdownItem[];
  salesPerson: string;
  salesContactNo: string;
  salesEmail: string;
  channelPartner: string;
  customerName: string;
  customerContactNo: string;
  customerEmail: string;
}

interface CreateQuotationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuotation?: (quotationData: QuotationFormData) => void;
  onUpdateQuotation?: (quotationData: QuotationFormData) => void;
  editingQuotation?: any;
  projects?: Array<{
    name: string;
    image: string;
    location: string;
    configuration: string;
    priceRange: string;
    category: string;
    status: string;
    features: string[];
  }>;
}

const defaultPriceItems = [
  { label: "Property Base Price", amount: 30000000, isDiscount: false },
  { label: "Parking", amount: 90000, isDiscount: false },
  { label: "Infrastructure Cost", amount: 70000, isDiscount: false },
  { label: "Development Charges", amount: 100000, isDiscount: false },
  { label: "Water Charges", amount: 100000, isDiscount: false },
  { label: "MSEB Charges", amount: 100000, isDiscount: false },
  { label: "Legal Charges", amount: 100000, isDiscount: false },
  { label: "Stamp Duty", amount: 100000, isDiscount: false },
  { label: "Registration Fee", amount: 100000, isDiscount: false },
  { label: "GST", amount: 100000, isDiscount: false },
  { label: "VAT", amount: 100000, isDiscount: false },
  { label: "Extra Work", amount: 100000, isDiscount: false },
  { label: "One-Time Maintenance", amount: 100000, isDiscount: false },
  { label: "Discount (Diwali Special)", amount: 7500000, isDiscount: true },
];

export function CreateQuotationDrawer({
  isOpen,
  onClose,
  onCreateQuotation,
  onUpdateQuotation,
  editingQuotation,
  projects = [],
}: CreateQuotationDrawerProps) {
  const [formData, setFormData] = useState<QuotationFormData>({
    project: "",
    wing: "",
    flatNo: "",
    floor: "",
    reraCarpetArea: "",
    priceBreakdown: defaultPriceItems,
    salesPerson: "",
    salesContactNo: "",
    salesEmail: "",
    channelPartner: "",
    customerName: "",
    customerContactNo: "",
    customerEmail: "",
  });

  const [newPriceItem, setNewPriceItem] = useState<{ label: string; amount: string; isDiscount: boolean }>({
    label: "",
    amount: "",
    isDiscount: false,
  });

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Load editing quotation data
  useEffect(() => {
    if (editingQuotation && isOpen) {
      setFormData({
        project: editingQuotation.project?.name || "",
        wing: editingQuotation.allocatedFlat?.wing || "",
        flatNo: editingQuotation.allocatedFlat?.flatNo || "",
        floor: editingQuotation.allocatedFlat?.floor || "",
        reraCarpetArea: editingQuotation.allocatedFlat?.reraCarpetArea || "",
        priceBreakdown: editingQuotation.priceBreakdown || defaultPriceItems,
        salesPerson: editingQuotation.assignedRepresentative?.salesPerson || "",
        salesContactNo: editingQuotation.assignedRepresentative?.contactNo || "",
        salesEmail: editingQuotation.assignedRepresentative?.email || "",
        channelPartner: editingQuotation.assignedRepresentative?.channelPartner || "",
        customerName: editingQuotation.clientInfo?.customerName || "",
        customerContactNo: editingQuotation.clientInfo?.contactNo || "",
        customerEmail: editingQuotation.clientInfo?.email || "",
      });
    }
  }, [editingQuotation, isOpen]);

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen && !editingQuotation) {
      setFormData({
        project: "",
        wing: "",
        flatNo: "",
        floor: "",
        reraCarpetArea: "",
        priceBreakdown: defaultPriceItems,
        salesPerson: "",
        salesContactNo: "",
        salesEmail: "",
        channelPartner: "",
        customerName: "",
        customerContactNo: "",
        customerEmail: "",
      });
      setNewPriceItem({ label: "", amount: "", isDiscount: false });
    }
  }, [isOpen, editingQuotation]);

  const handleAddPriceItem = () => {
    if (newPriceItem.label && newPriceItem.amount) {
      const amount = parseFloat(newPriceItem.amount) || 0;
      setFormData({
        ...formData,
        priceBreakdown: [
          ...formData.priceBreakdown,
          {
            label: newPriceItem.label,
            amount: newPriceItem.isDiscount ? -Math.abs(amount) : Math.abs(amount),
            isDiscount: newPriceItem.isDiscount,
          },
        ],
      });
      setNewPriceItem({ label: "", amount: "", isDiscount: false });
    }
  };

  const handleRemovePriceItem = (index: number) => {
    const newBreakdown = formData.priceBreakdown.filter((_, i) => i !== index);
    setFormData({ ...formData, priceBreakdown: newBreakdown });
  };

  const calculateFinalPrice = () => {
    return formData.priceBreakdown.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSubmit = () => {
    if (!formData.project || !formData.customerName || !formData.customerContactNo) {
      alert("Please fill in all required fields");
      return;
    }
    if (editingQuotation && onUpdateQuotation) {
      onUpdateQuotation(formData);
    } else {
      onCreateQuotation?.(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  const selectedProject = projects.find((p) => p.name === formData.project);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--sidebar-border-color)] sticky top-0 bg-white z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
            {editingQuotation ? "Edit Quotation" : "Create Quotation"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-[var(--sidebar-bg-hover)] transition-colors text-[var(--sidebar-text-main)]"
            aria-label="Close"
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 overflow-y-auto h-[calc(100vh-180px)]">
          <div className="space-y-4 sm:space-y-6">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                Select Project <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                  <Buildings size={20} weight="regular" />
                </div>
                <select
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="w-full pl-11 pr-10 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] appearance-none cursor-pointer"
                >
                  <option value="">Select a project</option>
                  {projects.map((project, index) => (
                    <option key={index} value={project.name}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)] pointer-events-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Allocated Flat Info */}
            <div className="border border-[var(--sidebar-border-color)] rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-[var(--sidebar-text-main)]">Allocated Flat Info</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Wing
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Buildings size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.wing}
                    onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
                    placeholder="A Wing"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Flat No
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Star size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.flatNo}
                    onChange={(e) => setFormData({ ...formData, flatNo: e.target.value })}
                    placeholder="B-403"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Floor
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Sparkle size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="12th Floor"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  RERA Carpet Area
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Shield size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.reraCarpetArea}
                    onChange={(e) => setFormData({ ...formData, reraCarpetArea: e.target.value })}
                    placeholder="705 sq.ft."
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="border border-[var(--sidebar-border-color)] rounded-lg p-4 space-y-4">
              <h3 className="text-base font-semibold text-[var(--sidebar-text-main)]">Price Breakdown</h3>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {formData.priceBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--sidebar-text-main)]">
                        {item.label}
                      </div>
                      <div className={`text-xs ${item.isDiscount ? "text-red-600" : "text-gray-600"}`}>
                        {item.isDiscount ? "-" : "+"} ₹{Math.abs(item.amount).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePriceItem(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash size={16} weight="regular" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Price Item */}
              <div className="border-t pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newPriceItem.label}
                    onChange={(e) => setNewPriceItem({ ...newPriceItem, label: e.target.value })}
                    placeholder="Item Label"
                    className="px-3 py-2 border border-[var(--sidebar-border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                  <input
                    type="number"
                    value={newPriceItem.amount}
                    onChange={(e) => setNewPriceItem({ ...newPriceItem, amount: e.target.value })}
                    placeholder="Amount"
                    className="px-3 py-2 border border-[var(--sidebar-border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newPriceItem.isDiscount}
                      onChange={(e) => setNewPriceItem({ ...newPriceItem, isDiscount: e.target.checked })}
                      className="rounded"
                    />
                    <span>Is Discount</span>
                  </label>
                  <button
                    onClick={handleAddPriceItem}
                    className="ml-auto px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg text-sm hover:bg-[var(--primary-hover)] flex items-center gap-2"
                  >
                    <Plus size={16} weight="regular" />
                    Add Item
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-[var(--sidebar-text-main)]">Final Deal Price</span>
                  <span className="text-lg font-bold text-green-600">
                    ₹{calculateFinalPrice().toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Representative */}
            <div className="border border-[var(--sidebar-border-color)] rounded-lg p-4 space-y-4">
              <h3 className="text-base font-semibold text-[var(--sidebar-text-main)]">Assigned Representative</h3>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Sales Person
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <User size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.salesPerson}
                    onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                    placeholder="Maaz Khan"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Contact No
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Phone size={20} weight="regular" />
                  </div>
                  <input
                    type="tel"
                    value={formData.salesContactNo}
                    onChange={(e) => setFormData({ ...formData, salesContactNo: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Envelope size={20} weight="regular" />
                  </div>
                  <input
                    type="email"
                    value={formData.salesEmail}
                    onChange={(e) => setFormData({ ...formData, salesEmail: e.target.value })}
                    placeholder="maazkhan78@gmail.com"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Channel Partner
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <ShieldCheck size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.channelPartner}
                    onChange={(e) => setFormData({ ...formData, channelPartner: e.target.value })}
                    placeholder="ABC Realty"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="border border-[var(--sidebar-border-color)] rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-[var(--sidebar-text-main)]">Client Information</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <User size={20} weight="regular" />
                  </div>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Zishan"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Contact No <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Phone size={20} weight="regular" />
                  </div>
                  <input
                    type="tel"
                    value={formData.customerContactNo}
                    onChange={(e) => setFormData({ ...formData, customerContactNo: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--sidebar-text-main)] mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]">
                    <Envelope size={20} weight="regular" />
                  </div>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="Zishan45@email.com"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 border-t border-[var(--sidebar-border-color)] bg-white flex gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-[var(--sidebar-border-color)] rounded-lg font-semibold text-[var(--sidebar-text-main)] hover:bg-[var(--sidebar-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            {editingQuotation ? "Update Quotation" : "Create Quotation"}
          </button>
        </div>
      </div>
    </>
  );
}


