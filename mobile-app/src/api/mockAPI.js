// src/api/mockAPI.js
// Mock API responses for development when backend is not available

export const getMockArtistDashboard = (artistId) => {
  return {
    success: true,
    artist: {
      id: artistId,
      name: "Mike Chen",
      email: "mike@inkvistar.com",
      phone: "+1 (555) 123-4567",
      studio_name: "Ink Masters Studio",
      experience_years: 8,
      specialization: "Traditional, Japanese",
      hourly_rate: 150,
      rating: 4.9,
      total_reviews: 89,
      is_available: true
    },
    appointments: [
      {
        id: 1,
        client_name: "John Smith",
        client_email: "john@email.com",
        design_title: "Traditional Eagle",
        appointment_date: new Date().toISOString().split('T')[0],
        start_time: "14:00:00",
        end_time: "16:00:00",
        status: "confirmed",
        notes: "First session of eagle chest piece"
      },
      {
        id: 2,
        client_name: "Emma Wilson",
        client_email: "emma@email.com",
        design_title: "Single Line Bird",
        appointment_date: new Date().toISOString().split('T')[0],
        start_time: "10:00:00",
        end_time: "11:30:00",
        status: "confirmed",
        notes: "Single line bird on wrist"
      }
    ],
    works: [
      {
        id: 1,
        title: "Dragon Sleeve",
        description: "Full sleeve Japanese dragon with waves and clouds",
        category: "Traditional",
        image_url: null,
        likes: 234,
        created_at: "2026-01-20T10:30:00Z"
      },
      {
        id: 2,
        title: "Minimalist Rose",
        description: "Delicate single line rose with dotwork shading",
        category: "Minimalist",
        image_url: null,
        likes: 189,
        created_at: "2026-01-18T14:20:00Z"
      },
      {
        id: 3,
        title: "Geometric Lion",
        description: "Geometric interpretation of a lion head",
        category: "Geometric",
        image_url: null,
        likes: 312,
        created_at: "2026-01-15T11:45:00Z"
      }
    ],
    stats: {
      total_appointments: 42,
      total_earnings: 12500,
      avg_rating: 4.9,
      total_reviews: 89
    }
  };
};

export const getMockArtistClients = (artistId) => {
  return {
    success: true,
    clients: [
      {
        id: 1,
        name: "John Smith",
        email: "john@email.com",
        phone: "+1 (555) 456-7890",
        sessions: 3,
        spent: "$850",
        lastVisit: "Jan 15, 2026",
        savedDesigns: 2
      },
      {
        id: 2,
        name: "Emma Wilson",
        email: "emma@email.com",
        phone: "+1 (555) 567-8901",
        sessions: 5,
        spent: "$1,200",
        lastVisit: "Jan 20, 2026",
        savedDesigns: 3
      },
      {
        id: 3,
        name: "Mike Johnson",
        email: "mike.j@email.com",
        phone: "+1 (555) 345-6789",
        sessions: 2,
        spent: "$450",
        lastVisit: "Jan 10, 2026",
        savedDesigns: 1
      }
    ]
  };
};

// Add more mock functions as needed...