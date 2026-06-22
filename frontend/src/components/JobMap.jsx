import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { ROMA_CENTER } from "../lib/roma";

// Custom ochre pin (SVG) — chunky neo-brutal romano
const pinHtml = (price) => `
  <div style="position:relative;transform:translate(-50%,-100%);">
    <svg width="46" height="58" viewBox="0 0 46 58" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 56C23 56 4 36 4 21C4 9.95 12.95 1 23 1C33.05 1 42 9.95 42 21C42 36 23 56 23 56Z"
        fill="#d97706" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="23" cy="21" r="9" fill="#fefbeb" stroke="#1c1917" stroke-width="2"/>
    </svg>
    <div style="position:absolute;left:50%;top:13px;transform:translateX(-50%);font-family:Outfit,sans-serif;font-weight:800;color:#1c1917;font-size:13px;line-height:1;">${price}€</div>
  </div>`;

const buildIcon = (price) => L.divIcon({
  html: pinHtml(price), className: "", iconSize: [46, 58], iconAnchor: [23, 58],
});

const ClickHandler = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick && onPick(e.latlng) });
  return null;
};

export const JobMap = ({ jobs, onJobApply, picker, onPick, pickerPos }) => {
  return (
    <div className="rounded-3xl border-[2.5px] border-stone-900 overflow-hidden pop-shadow"
      style={{ height: picker ? 280 : 460 }} data-testid={picker ? "picker-map" : "jobs-map"}>
      <MapContainer
        center={pickerPos || ROMA_CENTER} zoom={picker ? 13 : 12}
        scrollWheelZoom={!picker} style={{ height:"100%", width:"100%", filter:"sepia(0.25) saturate(0.92) hue-rotate(-8deg)" }}>
        <TileLayer attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        {picker && <ClickHandler onPick={onPick}/>}
        {picker && pickerPos && (
          <Marker position={pickerPos} icon={buildIcon("?")} />
        )}
        {!picker && jobs.map((j) => (
          j.lat && j.lng ? (
            <Marker key={j.id} position={[j.lat, j.lng]} icon={buildIcon(j.price)}>
              <Popup>
                <div className="font-display text-base text-stone-900 leading-tight">{j.title}</div>
                <div className="text-xs text-stone-600 mt-0.5">{j.neighborhood} · da {j.owner_name}</div>
                <div className="mt-1.5 inline-block bg-emerald-500 text-white font-display text-sm border-2 border-stone-900 rounded-md px-2 py-0.5">{j.price} € cash</div>
                {onJobApply && (
                  <button onClick={() => onJobApply(j)}
                    className="mt-2 w-full bg-[#d97706] text-white font-display text-sm py-1.5 rounded-full border-2 border-stone-900">Mi Candido</button>
                )}
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
};
