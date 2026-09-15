import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart } from 'lucide-react';

export default function AppointmentAftercareLink({ appointment }) {
  const service = String(appointment.service_type || '').trim().toLowerCase();
  if (appointment.status !== 'completed' || ['consultation', 'piercing', 'piercing session'].includes(service)) return null;

  return (
    <Link to={`/customer/aftercare?appointmentId=${encodeURIComponent(appointment.id)}`}
      onClick={(event) => event.stopPropagation()}
      className="btn appointment-aftercare-btn">
      <Heart size={15} aria-hidden="true" />
      <span>View Aftercare</span>
      <ArrowRight size={14} className="appointment-aftercare-arrow" aria-hidden="true" />
    </Link>
  );
}
