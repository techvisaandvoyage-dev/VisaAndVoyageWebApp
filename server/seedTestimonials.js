const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Testimonial = require('./models/Testimonial');

dotenv.config();

const videoStories = [
  {
    type: 'video',
    name: 'Rahul Sharma',
    place: 'Canada Tourist Visa',
    duration: '1:24',
    flag: '🇨🇦',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400'
  },
  {
    type: 'video',
    name: 'Ananya Iyer',
    place: 'Schengen Visa',
    duration: '1:35',
    flag: '🇪🇺',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  },
  {
    type: 'video',
    name: 'Mohammed Ali',
    place: 'UAE Tourist Visa',
    duration: '1:22',
    flag: '🇦🇪',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'
  },
  {
    type: 'video',
    name: 'Kenji Tanaka',
    place: 'Japan Tourist Visa',
    duration: '1:18',
    flag: '🇯🇵',
    image: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&q=80&w=400'
  },
  {
    type: 'video',
    name: 'Priya Mehta',
    place: 'UK Tourist Visa',
    duration: '1:30',
    flag: '🇬🇧',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400'
  }
];

const textReviews = [
  {
    type: 'text',
    name: 'Azhar Mateen',
    rating: '4.2/5',
    paragraph: 'Sello.pk offers a wide range of vehicles. I got a fantastic deal on a second-hand car, and the bike I bought is just as good. A one-stop shop for all types of vehicles!',
    image: 'https://i.pravatar.cc/150?u=azhar',
    color: 'bg-[#0252D5]',
    textColor: 'text-white'
  },
  {
    type: 'text',
    name: 'Ayesha Ibtisam',
    rating: '4.9/5',
    paragraph: 'I was looking for an e-bike, and I found just what I needed on Sello.pk. Fast delivery, and the bike runs perfectly. Great service!',
    image: 'https://i.pravatar.cc/150?u=ayesha',
    color: 'bg-white',
    textColor: 'text-slate-600'
  },
  {
    type: 'text',
    name: 'Ali Rehman',
    rating: '4.6/5',
    paragraph: 'I found my perfect bike on Sello.pk! The process was simple, and I got a great deal. Highly recommend checking out their listings!',
    image: 'https://i.pravatar.cc/150?u=ali',
    color: 'bg-[#0252D5]',
    textColor: 'text-white'
  },
  {
    type: 'text',
    name: 'Sakina Pal',
    rating: '4.8/5',
    paragraph: 'Amazing experience! The variety is great, and customer support was super helpful throughout the buying process. Will definitely buy again.',
    image: 'https://i.pravatar.cc/150?u=sakina',
    color: 'bg-white',
    textColor: 'text-slate-600'
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visavo', {
      
      
    });
    
    // Clear existing
    await Testimonial.deleteMany({});
    
    // Insert new
    await Testimonial.insertMany([...videoStories, ...textReviews]);
    
    console.log('Database seeded with testimonials');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedDB();
