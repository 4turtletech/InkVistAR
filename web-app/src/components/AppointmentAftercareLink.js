import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function AppointmentAftercareLink({ appointment }) {
  const service = String(appointment.service_type || '').trim().toLowerCase();
  if (appointment.status !== 'completed' || ['consultation', 'piercing', 'piercing session'].includes(service)) return null;

  return (
    <Link to={`/customer/aftercare?appointmentId=${encodeURIComponent(appointment.id)}`}
      onClick={(event) => event.stopPropagation()}
      className="btn btn-primary customer-st-6c6e14b5"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Heart size={14} /> Aftercare
    </Link>
  );
}
