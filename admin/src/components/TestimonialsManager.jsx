import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Save, X, Video, FileText, CheckCircle, Upload, Loader2 } from 'lucide-react';
import { api } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useDataStore } from '../store/dataStore';

export default function TestimonialsManager() {
  const showToast = useUIStore(state => state.showToast);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const { countries, fetchCountries } = useDataStore();
  const [visaTypesList, setVisaTypesList] = useState([]);
  
  const [geocodePlaces, setGeocodePlaces] = useState([]);
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const geocodeAbortRef = useRef(null);
  
  const [formData, setFormData] = useState({
    id: null,
    type: 'video',
    name: '',
    videoLink: '',
    place: '',
    visaType: '',
    image: '',
    paragraph: '',
    rating: '',
    isActive: true
  });

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/testimonials/all');
      setTestimonials(data);
    } catch (error) {
      showToast('Failed to fetch testimonials', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
    fetchCountries();
    api.get("/visa-types").then(res => {
      if(res.data && res.data.success) {
        setVisaTypesList(res.data.visaTypes || res.data);
      } else if (Array.isArray(res.data)) {
        setVisaTypesList(res.data);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const q = formData.place?.trim() || '';
    if (q.length < 1) {
      setGeocodePlaces([]);
      return;
    }

    if (geocodeAbortRef.current) geocodeAbortRef.current.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    setIsSearchingPlace(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/geocode/places?q=${encodeURIComponent(q)}&all=true`, {
          signal: geocodeAbortRef.current.signal
        });
        if (data?.success) {
          const places = Array.isArray(data.places) && data.places.length > 0
            ? data.places
            : Array.isArray(data.matches) ? data.matches.map(m => ({ primaryLabel: m.name, detailLabel: m.hint?.replace(/^Includes /, '') })) : [];
          setGeocodePlaces(places);
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.error(err);
        }
      } finally {
        setIsSearchingPlace(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.place]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const updates = { [name]: type === 'checkbox' ? checked : value };
      
      if (name === 'videoLink' && value) {
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = value.match(regExp);
        if (match && match[1]) {
          updates.image = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('image', file);

    setUploadingImage(true);
    showToast('Uploading image...', 'success');
    
    try {
      const { data } = await api.post('/testimonials/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image: data.url }));
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      showToast('Failed to upload image', 'error');
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      type: 'video',
      name: '',
      videoLink: '',
      place: '',
      visaType: '',
      image: '',
      paragraph: '',
      rating: '',
      isActive: true
    });
    setIsEditing(false);
  };

  const handleEdit = (t) => {
    setFormData({
      id: t._id,
      type: t.type || 'video',
      name: t.name || '',
      videoLink: t.videoLink || '',
      place: t.place || '',
      visaType: t.visaType || '',
      image: t.image || '',
      paragraph: t.paragraph || '',
      rating: t.rating || '',
      isActive: t.isActive ?? true
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      await api.delete(`/testimonials/${id}`);
      showToast('Testimonial deleted', 'success');
      fetchTestimonials();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      // Force auto-extract YouTube thumbnail on submit just to be safe
      if (submitData.type === 'video' && submitData.videoLink) {
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = submitData.videoLink.match(regExp);
        if (match && match[1]) {
          submitData.image = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
        }
      }

      if (submitData.id) {
        await api.put(`/testimonials/${submitData.id}`, submitData);
        showToast('Testimonial updated', 'success');
      } else {
        await api.post('/testimonials', submitData);
        showToast('Testimonial added', 'success');
      }
      resetForm();
      fetchTestimonials();
    } catch (err) {
      showToast(formData.id ? 'Failed to update' : 'Failed to add', 'error');
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Section */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary">
            {isEditing ? 'Edit Testimonial' : 'Add New Testimonial'}
          </h3>
          {isEditing && (
            <button onClick={resetForm} className="text-text-muted hover:text-text-primary">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="video" checked={formData.type === 'video'} onChange={handleInputChange} className="text-cyan focus:ring-cyan" />
                  <Video size={16} className={formData.type === 'video' ? 'text-cyan' : 'text-text-muted'} />
                  <span className={formData.type === 'video' ? 'font-medium' : ''}>Video</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="text" checked={formData.type === 'text'} onChange={handleInputChange} className="text-cyan focus:ring-cyan" />
                  <FileText size={16} className={formData.type === 'text' ? 'text-cyan' : 'text-text-muted'} />
                  <span className={formData.type === 'text' ? 'font-medium' : ''}>Text</span>
                </label>
              </div>
            </div>

            {/* Active Status removed as per user request */}

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="Customer Name" />
            </div>

            {formData.type === 'video' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Video Link *</label>
                  <input type="url" name="videoLink" value={formData.videoLink} onChange={handleInputChange} required className="w-full rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="YouTube or Instagram link" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Thumbnail Image URL *</label>
                  <div className="flex items-center gap-2">
                    <input type="url" name="image" value={formData.image} onChange={handleInputChange} required className="flex-1 rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="Required for Instagram. Auto-fills for YouTube." />
                    <label className={`cursor-pointer shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={16} className="mr-1.5" /> {uploadingImage ? 'Uploading...' : 'Upload'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                      Place * {isSearchingPlace && <Loader2 size={12} className="animate-spin text-cyan" />}
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        name="place" 
                        value={formData.place} 
                        onChange={handleInputChange} 
                        onFocus={() => setShowPlaceDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPlaceDropdown(false), 200)}
                        required 
                        autoComplete="off"
                        className="w-full rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" 
                        placeholder="e.g., Canada" 
                      />
                      {showPlaceDropdown && (geocodePlaces.length > 0 || countries?.length > 0) && (
                        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                          {geocodePlaces.length > 0 
                            ? geocodePlaces.map((p, i) => {
                                const labels = [p.primaryLabel, p.detailLabel].filter(Boolean);
                                const uniqueLabels = [...new Set(labels)];
                                const val = uniqueLabels.join(', ') || p.displayName;
                                return (
                                  <li 
                                    key={i} 
                                    className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormData(prev => ({ ...prev, place: val || p.name }));
                                      setShowPlaceDropdown(false);
                                    }}
                                  >
                                    {val || p.name}
                                  </li>
                                );
                              })
                            : countries?.map(c => (
                                <li 
                                  key={c._id || c.id} 
                                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData(prev => ({ ...prev, place: c.name }));
                                    setShowPlaceDropdown(false);
                                  }}
                                >
                                  {c.name}
                                </li>
                              ))
                          }
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">Visa Type *</label>
                    <input type="text" list="visa-list" name="visaType" value={formData.visaType} onChange={handleInputChange} required className="w-full rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="e.g., Tourist Visa" />
                    <datalist id="visa-list">
                      {visaTypesList?.map(v => <option key={v._id || v.id} value={v.name} />)}
                    </datalist>
                  </div>
                </div>
              </>
            )}

            {formData.type === 'text' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Avatar Image URL (Optional)</label>
                  <div className="flex items-center gap-2">
                    <input type="url" name="image" value={formData.image} onChange={handleInputChange} className="flex-1 rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="https://..." />
                    <label className={`cursor-pointer shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={16} className="mr-1.5" /> {uploadingImage ? 'Uploading...' : 'Upload'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Rating *</label>
                  <input type="text" name="rating" value={formData.rating} onChange={handleInputChange} required className="w-full rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="e.g., 4.9/5" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-primary">Review Paragraph *</label>
                  <textarea name="paragraph" value={formData.paragraph} onChange={handleInputChange} required rows={3} className="w-full rounded-lg border-border bg-surface px-4 py-2 text-sm focus:border-cyan focus:ring-cyan" placeholder="Their review text..."></textarea>
                </div>
              </>
            )}

          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-cyan px-6 py-2.5 text-sm font-medium text-white hover:bg-cyan-dim transition-colors">
              <Save size={18} />
              {isEditing ? 'Save Changes' : 'Add Testimonial'}
            </button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-2 flex justify-between items-center">
          <h3 className="font-bold text-text-primary">Existing Testimonials</h3>
          <span className="text-xs bg-white px-2 py-1 rounded border border-border text-text-muted">{testimonials.length} total</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading testimonials...</div>
        ) : testimonials.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No testimonials found. Add one above!</div>
        ) : (
          <div className="divide-y divide-border">
            {testimonials.map(t => (
              <div key={t._id} className="p-4 flex items-center justify-between hover:bg-surface-2 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center overflow-hidden shrink-0">
                    {t.image ? (
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    ) : t.type === 'video' ? <Video size={20} className="text-text-muted" /> : <FileText size={20} className="text-text-muted" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary flex items-center gap-2">
                      {t.name}
                      {t.type === 'video' ? <Video size={14} className="text-cyan" /> : <FileText size={14} className="text-cyan" />}
                    </h4>
                    <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                      {t.type === 'video' ? `${t.place} ${t.visaType ? `- ${t.visaType}` : ''}` : t.paragraph}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(t)} className="p-2 text-text-muted hover:text-cyan hover:bg-cyan/10 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(t._id)} className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
