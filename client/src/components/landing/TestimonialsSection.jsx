import React, { useRef, useState, useEffect } from 'react';
import { Heart, Video, ChevronLeft, ChevronRight, Play, Star, Quote, X } from 'lucide-react';

import { api } from '../../store/authStore';

export default function TestimonialsSection({ testimonials: initialTestimonials }) {
  const videoScrollRef = useRef(null);
  const textScrollRef = useRef(null);

  const [videoDots, setVideoDots] = useState(0);
  const [videoActiveDot, setVideoActiveDot] = useState(0);
  
  const [textDots, setTextDots] = useState(0);
  const [textActiveDot, setTextActiveDot] = useState(0);

  const [videoStories, setVideoStories] = useState([]);
  const [textReviews, setTextReviews] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeTextReview, setActiveTextReview] = useState(null);

  // Helper to extract YouTube video ID and create embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regExp);
    return (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
  };

  const getHighResImage = (url) => {
    if (!url) return '';
    return url.replace('hqdefault.jpg', 'maxresdefault.jpg');
  };

  const handleVideoClick = (videoLink) => {
    if (!videoLink) return;
    if (videoLink.toLowerCase().includes('youtube.com') || videoLink.toLowerCase().includes('youtu.be')) {
      setActiveVideo(videoLink);
    } else {
      window.open(videoLink, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data } = await api.get('/testimonials');
        setVideoStories(data.filter(t => t.type === 'video'));
        setTextReviews(data.filter(t => t.type === 'text'));
      } catch (err) {
        console.error('Error fetching testimonials:', err);
      }
    };
    fetchTestimonials();
  }, []);

  useEffect(() => {
    const updatePagination = (ref, setDots, setActiveDot) => {
      if (!ref.current) return;
      const { scrollWidth, clientWidth, scrollLeft } = ref.current;
      // Calculate how many full "pages" (rows) exist
      const pageCount = Math.max(1, Math.ceil(scrollWidth / clientWidth));
      
      // If everything fits on one page, show 0 dots
      setDots(pageCount > 1 ? pageCount : 0);
      
      // Calculate active page based on scroll position
      if (pageCount > 1) {
        const maxScroll = scrollWidth - clientWidth;
        const scrollPercent = maxScroll > 0 ? scrollLeft / maxScroll : 0;
        const active = Math.round(scrollPercent * (pageCount - 1));
        setActiveDot(active);
      } else {
        setActiveDot(0);
      }
    };

    const handleVideoScroll = () => updatePagination(videoScrollRef, setVideoDots, setVideoActiveDot);
    const handleTextScroll = () => updatePagination(textScrollRef, setTextDots, setTextActiveDot);

    // Small delay to ensure layout is complete before initial calculation
    const timer = setTimeout(() => {
      handleVideoScroll();
      handleTextScroll();
    }, 100);

    const videoRef = videoScrollRef.current;
    const textRef = textScrollRef.current;

    videoRef?.addEventListener('scroll', handleVideoScroll, { passive: true });
    textRef?.addEventListener('scroll', handleTextScroll, { passive: true });
    window.addEventListener('resize', handleVideoScroll);
    window.addEventListener('resize', handleTextScroll);

    return () => {
      clearTimeout(timer);
      videoRef?.removeEventListener('scroll', handleVideoScroll);
      textRef?.removeEventListener('scroll', handleTextScroll);
      window.removeEventListener('resize', handleVideoScroll);
      window.removeEventListener('resize', handleTextScroll);
    };
  }, []);

  const scrollLeft = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="pt-2 pb-8 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col items-center text-center mb-6">
       
        <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-2">
          Why Travelers Choose Us
        </h2>
        <p className="text-sm md:text-base text-slate-500">
          Real experiences from our valued customers around the world
        </p>
      </div>

      {/* Video Stories */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#0252D5] text-white p-2 rounded-lg">
              <Video size={24} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0F172A]">Video Testimonials</h3>
              <p className="text-sm text-slate-500">Hear directly from our happy travelers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => scrollLeft(videoScrollRef)}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="Previous videos"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <button 
              onClick={() => scrollRight(videoScrollRef)}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="Next videos"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div 
          ref={videoScrollRef}
          className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {videoStories.map((story) => (
            <div 
              key={story.id || story._id} 
              onClick={() => handleVideoClick(story.videoLink)}
              className="relative flex-shrink-0 w-[270px] h-[480px] rounded-[20px] overflow-hidden snap-start group cursor-pointer"
            >
              {/* Background Image */}
              <div 
                className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 ${!story.image ? 'bg-slate-800' : ''}`}
                style={story.image ? { backgroundImage: `url(${getHighResImage(story.image)})` } : {}}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                  <Play size={24} fill="#0252D5" className="text-[#0252D5] ml-1" />
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-4 left-4 right-4 flex flex-col justify-end">
                <h4 className="font-semibold text-white text-base line-clamp-1 group-hover:text-cyan transition-colors">{story.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-white/90 capitalize">
                    {story.place}
                    {story.visaType && <span className="opacity-75"> - {story.visaType}</span>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination Dots */}
        {videoDots > 0 && (
          <div className="flex justify-center gap-2 mt-2">
            {Array.from({ length: videoDots }).map((_, index) => (
              <div 
                key={index} 
                className={`w-2.5 h-2.5 rounded-full transition-colors ${index === videoActiveDot ? 'bg-[#0252D5]' : 'bg-slate-200'}`}
              ></div>
            ))}
          </div>
        )}
      </div>

      {/* Text Reviews */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#0252D5] text-white p-2 rounded-lg">
              <Quote size={24} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#0F172A]">What Our Travelers Say</h3>
              <p className="text-sm text-slate-500">Genuine reviews from our valued customers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => scrollLeft(textScrollRef)}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="Previous reviews"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <button 
              onClick={() => scrollRight(textScrollRef)}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="Next reviews"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div 
          ref={textScrollRef}
          className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pt-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {textReviews.map((review, index) => {
            const isBlue = index % 2 === 1;
            const cardBg = isBlue ? 'bg-[#0252D5]' : 'bg-white';
            const textColor = isBlue ? 'text-white' : 'text-slate-600';
            const iconColor = isBlue ? 'text-white opacity-20' : 'text-[#0252D5] opacity-30';
            const quoteBg = isBlue ? 'bg-white' : 'bg-[#F0F7FF]';

            return (
              <div 
                key={review._id || index} 
                onClick={() => setActiveTextReview({ ...review, computedBg: cardBg, computedText: textColor, computedIcon: iconColor })}
                className={`relative flex-shrink-0 w-[270px] md:w-[280px] h-[260px] rounded-[20px] p-5 shadow-sm border border-slate-100 snap-start flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow ${cardBg}`}
              >
                {/* Sparkle decorative icons */}
                <div className={`absolute -top-3 -left-3 ${iconColor}`}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg>
                </div>
                <div className={`absolute -bottom-3 -right-3 ${iconColor}`}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" /></svg>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src={review.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name || 'User')}&background=f1f5f9&color=64748b&rounded=true&size=128`} 
                      alt={review.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-sm"
                    />
                    <div>
                      <h4 className={`font-semibold text-base ${textColor}`}>{review.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={12} fill="#FCD34D" className="text-yellow-400" />
                        <span className={`text-xs font-medium ${textColor} opacity-90`}>{review.rating}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm leading-relaxed line-clamp-4 ${textColor} opacity-90`}>
                    "{review.paragraph}"
                  </p>
                </div>

                <div className="flex items-center justify-start mt-auto">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quoteBg}`}>
                    <Quote size={14} className="text-[#0252D5]" fill="currentColor" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Pagination Dots */}
        {textDots > 0 && (
          <div className="flex justify-center gap-2 mt-2">
            {Array.from({ length: textDots }).map((_, index) => (
              <div 
                key={index} 
                className={`w-2.5 h-2.5 rounded-full transition-colors ${index === textActiveDot ? 'bg-[#0252D5]' : 'bg-slate-200'}`}
              ></div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
      {/* YouTube Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative h-[85vh] aspect-[9/16] max-w-full bg-black rounded-xl overflow-hidden shadow-2xl">
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <X size={20} />
            </button>
            <iframe
              src={getYouTubeEmbedUrl(activeVideo)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      )}

      {/* Text Review Modal */}
      {activeTextReview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActiveTextReview(null)}>
          <div className={`relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8 ${activeTextReview.computedBg || 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setActiveTextReview(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <img 
                src={activeTextReview.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeTextReview.name || 'User')}&background=f1f5f9&color=64748b&rounded=true&size=128`} 
                alt={activeTextReview.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-sm"
              />
              <div>
                <h4 className={`font-bold text-lg ${activeTextReview.computedText || 'text-slate-700'}`}>{activeTextReview.name}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star size={14} fill="#FCD34D" className="text-yellow-400" />
                  <span className={`text-sm font-semibold ${activeTextReview.computedText || 'text-slate-600'} opacity-90`}>{activeTextReview.rating}</span>
                </div>
              </div>
            </div>
            
            <div className="relative max-h-[50vh] overflow-y-auto pr-4" style={{ scrollbarWidth: 'thin' }}>
              <Quote size={24} className="text-[#0252D5] opacity-20 absolute top-0 -left-2" fill="currentColor" />
              <p className={`text-base leading-relaxed relative z-10 pl-4 pb-2 pt-1 ${activeTextReview.computedText || 'text-slate-600'} opacity-95`}>
                "{activeTextReview.paragraph}"
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
