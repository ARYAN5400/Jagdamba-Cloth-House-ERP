import React, { useState, useEffect } from 'react';
import { Search, Plus, Barcode, RefreshCw, Edit, Trash2, AlertTriangle, Filter, Shirt, PackageCheck } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export function Inventory() {
  const { addToast } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // Modal State for Quick Stock Update
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);
  const [newStockInput, setNewStockInput] = useState('');

  // Confirm Delete Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const initialFormState = {
    name: '',
    design_no: '',
    category_id: '',
    brand_id: '',
    fabric_type: 'Cotton',
    colour: '',
    size: '',
    unit_type: 'piece', // 'piece', 'meter', 'other'
    purchase_price: '',
    selling_price: '',
    wholesale_price: '',
    mrp: '',
    gst_rate: '5',
    hsn_code: '5407',
    stock_quantity: '',
    min_stock_alert: '5',
    barcode: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search,
          category_id: selectedCategory,
          brand_id: selectedBrand,
          low_stock: showLowStockOnly ? true : undefined
        }
      });
      setProducts(res.data || []);
    } catch (err) {
      addToast('Failed to load products from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands')
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedBrand, showLowStockOnly]);

  const openAddModal = () => {
    setEditingProductId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name || '',
      design_no: product.design_no || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      fabric_type: product.fabric_type || 'Cotton',
      colour: product.colour || '',
      size: product.size || '',
      unit_type: product.unit_type || 'piece',
      purchase_price: product.purchase_price || '',
      selling_price: product.selling_price || '',
      wholesale_price: product.wholesale_price || '',
      mrp: product.mrp || '',
      gst_rate: product.gst_rate || '5',
      hsn_code: product.hsn_code || '5407',
      stock_quantity: product.stock_quantity || '',
      min_stock_alert: product.min_stock_alert || '5',
      barcode: product.barcode || '',
      notes: product.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, formData);
        addToast(`Product '${formData.name}' updated successfully!`, 'success');
      } else {
        await api.post('/products', formData);
        addToast(`Product '${formData.name}' created successfully!`, 'success');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      addToast(err.message || 'Failed to save product', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/products/${deleteConfirmId}`);
      addToast('Product deleted from database.', 'success');
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (err) {
      addToast('Failed to delete product', 'error');
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedProductForStock || newStockInput === '') return;
    try {
      await api.put(`/products/${selectedProductForStock.id}`, {
        ...selectedProductForStock,
        stock_quantity: parseFloat(newStockInput)
      });
      addToast(`Stock for '${selectedProductForStock.name}' updated to ${newStockInput} ${selectedProductForStock.unit_type}s`, 'success');
      setIsStockModalOpen(false);
      setSelectedProductForStock(null);
      fetchProducts();
    } catch (err) {
      addToast('Failed to update stock', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product & Inventory Management</h2>
          <p className="text-xs text-slate-500 mt-1">Manage Suits, Fabric Rolls (Meters), Dress Materials & Catalogue Stock</p>
        </div>
        <Button onClick={openAddModal} icon={Plus} size="lg" className="bg-brand-600 hover:bg-brand-500 font-bold shadow-md">
          + Add Product
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by Product Name, Design No, Barcode..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-brand-500 focus:outline-none"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">All Brands / Catalogs</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                showLowStockOnly 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Only
            </button>
            <Button variant="outline" size="sm" onClick={fetchProducts} icon={RefreshCw} title="Refresh Products">
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50/80">
                <th className="p-3 sm:p-4">Product & Design No</th>
                <th className="p-3 sm:p-4">Brand & Category</th>
                <th className="p-3 sm:p-4">Fabric / Unit</th>
                <th className="p-3 sm:p-4 text-right">Purchase Price</th>
                <th className="p-3 sm:p-4 text-right">Selling Rate</th>
                <th className="p-3 sm:p-4 text-center">Current Stock</th>
                <th className="p-3 sm:p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">Loading products from SQLite database...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-slate-400">
                    <Shirt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <h4 className="font-bold text-slate-700 text-base">No Products Found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Your product inventory is empty. Click the <span className="font-bold text-brand-600">+ Add Product</span> button above to create your first unstitched suit or fabric item.
                    </p>
                    <Button onClick={openAddModal} icon={Plus} className="mt-4 bg-brand-600 text-white">
                      + Add First Product
                    </Button>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLowStock = p.stock_quantity <= p.min_stock_alert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{p.name}</span>
                          <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                            #{p.design_no}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          {p.barcode && <span className="font-mono">Barcode: {p.barcode}</span>}
                          {p.hsn_code && <span>HSN: {p.hsn_code}</span>}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="font-semibold text-slate-800">{p.brand_name || 'Generic'}</div>
                        <span className="text-xs text-slate-500">{p.category_name || 'Unassigned'}</span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="slate">{p.fabric_type || 'Cotton'}</Badge>
                          <Badge variant={p.unit_type === 'meter' ? 'info' : 'slate'}>{p.unit_type}</Badge>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right font-mono text-slate-600">₹{parseFloat(p.purchase_price || 0).toFixed(2)}</td>
                      <td className="p-3 sm:p-4 text-right font-extrabold text-slate-900">₹{parseFloat(p.selling_price || 0).toFixed(2)}</td>
                      <td className="p-3 sm:p-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedProductForStock(p);
                            setNewStockInput(p.stock_quantity.toString());
                            setIsStockModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-105 ${
                            isLowStock 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                          title="Click to update stock"
                        >
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{p.stock_quantity} {p.unit_type}s</span>
                        </button>
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProductId ? "Edit Product Details" : "+ Add New Clothing / Fabric Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Product / Suit Title *"
              required
              placeholder="e.g. Ganga Jam Silk 3PC Suit"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Design / Suit No. *"
              required
              placeholder="e.g. D-101 or R-402"
              value={formData.design_no}
              onChange={(e) => setFormData({ ...formData, design_no: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Category</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Brand / Catalog Name</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800"
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              >
                <option value="">Select Brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Fabric Material"
              placeholder="Cotton / Silk / Lawn"
              value={formData.fabric_type}
              onChange={(e) => setFormData({ ...formData, fabric_type: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-slate-700">Unit Type *</label>
              <select
                className="w-full mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800"
                value={formData.unit_type}
                onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
              >
                <option value="piece">piece (Cut / Suit Set)</option>
                <option value="meter">meter (Running Roll)</option>
                <option value="other">other</option>
              </select>
            </div>
            <Input
              label="GST %"
              type="number"
              value={formData.gst_rate}
              onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Purchase Price (₹)"
              type="number"
              placeholder="0"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            />
            <Input
              label="Selling Price / Rate (₹) *"
              type="number"
              required
              placeholder="0"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
            />
            <Input
              label="Current Stock Quantity *"
              type="number"
              required
              placeholder="e.g. 20 or 150.5"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Low Stock Threshold"
              type="number"
              placeholder="5"
              value={formData.min_stock_alert}
              onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
            />
            <Input
              label="Barcode / Custom EAN"
              placeholder="Auto-generated if empty"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />
            <Input
              label="HSN Code"
              placeholder="5407"
              value={formData.hsn_code}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white font-bold w-full sm:w-auto">
              {editingProductId ? "Update Product" : "Save New Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Update Modal */}
      {selectedProductForStock && (
        <Modal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          title={`Update Stock Level: ${selectedProductForStock.name}`}
        >
          <form onSubmit={handleUpdateStock} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><span className="font-bold text-slate-700">Design No:</span> #{selectedProductForStock.design_no}</div>
              <div><span className="font-bold text-slate-700">Unit Type:</span> {selectedProductForStock.unit_type}</div>
              <div><span className="font-bold text-slate-700">Current Stock:</span> {selectedProductForStock.stock_quantity}</div>
            </div>

            <Input
              label={`New Stock Quantity (${selectedProductForStock.unit_type}s) *`}
              type="number"
              required
              step={selectedProductForStock.unit_type === 'meter' ? '0.25' : '1'}
              value={newStockInput}
              onChange={(e) => setNewStockInput(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsStockModalOpen(false)}>Cancel</Button>
              <Button type="submit" icon={PackageCheck}>Update Stock</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Confirm Delete Product"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Yes, Delete Product
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
