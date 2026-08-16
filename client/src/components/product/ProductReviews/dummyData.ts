export type Review = {
  id: string;
  user: {
    name: string;
    avatar: string;
    country: string;
    countryCode: string;
  };
  verified: boolean;
  date: string;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  helpfulCount: number;
  images?: string[];
  reply?: {
    storeName: string;
    content: string;
    date: string;
  };
};

export const dummyReviews: Review[] = [
  {
    id: 'rev_1',
    user: {
      name: 'ArKo Saha',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      country: 'Bangladesh',
      countryCode: 'BD',
    },
    verified: true,
    date: '3 months ago',
    rating: 5,
    title: 'Excellent GPU for AI and Gaming',
    content:
      'The RTX 5060 Ti performs incredibly well for gaming, Stable Diffusion, and local LLM inference. Temperatures remain cool and the build quality is excellent. I upgraded from a 3060 and the difference in 1440p gaming is night and day. Highly recommend this for anyone looking for a solid mid-range card with great AI capabilities.',
    pros: ['Runs cool and quiet', 'Great 1440p performance', 'DLSS 4 support is amazing'],
    helpfulCount: 42,
  },
  {
    id: 'rev_2',
    user: {
      name: 'Sarah Chen',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
      country: 'United States',
      countryCode: 'US',
    },
    verified: true,
    date: '1 month ago',
    rating: 4,
    title: 'Great card, but 8GB VRAM is limiting',
    content:
      'Overall a very solid graphics card. Frame rates are high in most games. However, giving a next-gen card only 8GB of VRAM feels like a missed opportunity. Some newer games are already pushing that limit at 1440p.',
    cons: ['Only 8GB VRAM'],
    helpfulCount: 156,
    images: [
      'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400',
    ],
    reply: {
      storeName: 'PC KINBA Support',
      content:
        'Thank you for your review, Sarah! We agree that 8GB can be tight for some extreme workloads, but DLSS 4 helps mitigate memory bandwidth issues significantly. Enjoy your new GPU!',
      date: '3 weeks ago',
    },
  },
  {
    id: 'rev_3',
    user: {
      name: 'Marcus Johnson',
      avatar:
        'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100',
      country: 'United Kingdom',
      countryCode: 'GB',
    },
    verified: false,
    date: '2 weeks ago',
    rating: 5,
    title: 'Flawless 1080p gaming machine',
    content:
      "Bought this for my son's new build. It absolutely crushes any 1080p game you throw at it. Cyberpunk runs like a dream with ray tracing turned on. The design of the card is also very sleek and minimal.",
    helpfulCount: 12,
  },
  {
    id: 'rev_4',
    user: {
      name: 'Elena Rodriguez',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100',
      country: 'Spain',
      countryCode: 'ES',
    },
    verified: true,
    date: '5 days ago',
    rating: 3,
    title: 'Good performance, loud fans',
    content:
      'The performance is as expected, but the fans on this specific AERO model spin up very loud under load. I had to set a custom fan curve in MSI Afterburner to keep the noise down. Not a dealbreaker, but slightly annoying out of the box.',
    pros: ['Looks beautiful', 'Strong rasterization performance'],
    cons: ['Fans are noisy under heavy load'],
    helpfulCount: 8,
  },
  {
    id: 'rev_5',
    user: {
      name: 'David Kim',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
      country: 'South Korea',
      countryCode: 'KR',
    },
    verified: true,
    date: '2 months ago',
    rating: 1,
    title: 'Arrived dead on arrival',
    content:
      'Unfortunately, my unit was DOA. Would not display anything and the fans spun at 100%. Had to return it. Giving 1 star for the hassle, but the return process was at least smooth.',
    helpfulCount: 114,
    reply: {
      storeName: 'PC KINBA RMA Department',
      content:
        'We sincerely apologize for the inconvenience, David. This is rare but can happen during shipping. We are glad we could process your replacement quickly.',
      date: '2 months ago',
    },
  },
  {
    id: 'rev_6',
    user: {
      name: 'Anita Patel',
      avatar:
        'https://images.unsplash.com/photo-1619895862022-09114b41f16f?auto=format&fit=crop&q=80&w=100',
      country: 'India',
      countryCode: 'IN',
    },
    verified: true,
    date: '4 months ago',
    rating: 5,
    title: 'Perfect for my SFF build',
    content:
      'Fits perfectly into my small form factor ITX case. Does not draw too much power, so my 600W SFX power supply handles it without breaking a sweat.',
    helpfulCount: 23,
    images: [
      'https://images.unsplash.com/photo-1541029071515-84cc54f84cb5?auto=format&fit=crop&q=80&w=400',
    ],
  },
  {
    id: 'rev_7',
    user: {
      name: 'James Wilson',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
      country: 'Australia',
      countryCode: 'AU',
    },
    verified: false,
    date: '6 months ago',
    rating: 4,
    title: 'Solid upgrade path',
    content:
      'Great upgrade from a GTX 1070. The leap in technology with DLSS 4 is mind-blowing. I docked one star because the pricing feels a bit high for a 60-class card.',
    helpfulCount: 55,
  },
  {
    id: 'rev_8',
    user: {
      name: 'Sophie Martin',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100',
      country: 'France',
      countryCode: 'FR',
    },
    verified: true,
    date: 'Just now',
    rating: 5,
    title: 'Wow. Just wow.',
    content:
      'I have no words. The graphics are stunning and I can finally play Alan Wake 2 with full path tracing at decent framerates. Totally worth the investment.',
    helpfulCount: 2,
  },
];
