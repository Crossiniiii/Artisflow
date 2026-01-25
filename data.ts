
import { Artwork, ArtworkStatus, SaleRecord, ActivityLog, ExhibitionEvent, EventStatus } from './types';

// Get current month and last month dates for demo purposes
const now = new Date();
const currentMonthStr = now.toISOString().substring(0, 7); // YYYY-MM
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastMonthStr = lastMonth.toISOString().substring(0, 7); // YYYY-MM

export const INITIAL_ARTWORKS: Artwork[] = [
  {
    id: '1',
    code: 'ART-2024-001',
    title: 'Ethereal Whispers',
    artist: 'Elena Rossi',
    medium: 'Oil on Canvas',
    dimensions: '120 x 90 cm',
    year: '2024',
    price: 12500,
    status: ArtworkStatus.AVAILABLE,
    currentBranch: 'Main Gallery',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop',
    createdAt: `${lastMonthStr}-10T09:00:00Z`
  },
  {
    id: '3',
    code: 'ART-2024-003',
    title: 'Midnight Serenade',
    artist: 'Sarah Jenkins',
    medium: 'Acrylic and Gold Leaf',
    dimensions: '100 x 100 cm',
    year: '2024',
    price: 15000,
    status: ArtworkStatus.AVAILABLE,
    currentBranch: 'West Branch',
    imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=800&auto=format&fit=crop',
    createdAt: `${currentMonthStr}-01T11:20:00Z`
  },
  {
    id: '4',
    code: 'ART-2024-004',
    title: 'Urban Decay',
    artist: 'Liam O’Donnell',
    medium: 'Photography',
    dimensions: '60 x 90 cm',
    year: '2022',
    price: 3200,
    status: ArtworkStatus.DELIVERED,
    currentBranch: 'Private Collection',
    imageUrl: 'https://images.unsplash.com/photo-1576158113928-4c240eaaf360?q=80&w=800&auto=format&fit=crop',
    createdAt: `${currentMonthStr}-05T16:45:00Z`
  }
];

export const INITIAL_EVENTS: ExhibitionEvent[] = [
  {
    id: 'e1',
    title: 'Modern Abstract Retrospective',
    location: 'Main Gallery',
    startDate: '2024-03-01',
    endDate: '2024-03-31',
    status: EventStatus.LIVE,
    artworkIds: ['1', '3']
  },
  {
    id: 'e3',
    title: 'Winter Solstice Showcase',
    location: 'West Branch',
    startDate: '2023-12-01',
    endDate: '2024-01-15',
    status: EventStatus.RECENT,
    artworkIds: ['4']
  }
];

export const INITIAL_SALES: SaleRecord[] = [
  {
    id: 's2',
    artworkId: '4',
    clientName: 'Robert De Niro',
    agentName: 'Emma Stone',
    saleDate: '2024-01-20T12:00:00Z',
    deliveryDate: '2024-01-25T14:00:00Z',
    isDelivered: true
  }
];

export const INITIAL_LOGS: ActivityLog[] = [
  { id: 'l1', artworkId: '1', action: 'Created', user: 'Inventory Admin', timestamp: '2024-01-10T09:00:00Z' },
  { id: 'l4', artworkId: '4', action: 'Created', user: 'Inventory Admin', timestamp: '2024-02-10T16:45:00Z' },
  { id: 'l5', artworkId: '4', action: 'Delivered', user: 'Sales Agent James', timestamp: '2024-01-25T14:00:00Z' }
];
