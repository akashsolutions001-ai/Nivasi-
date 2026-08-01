import React from 'react';
import { Home, CheckCircle, Clock, AlertCircle, MapPin, Building2 } from 'lucide-react';
import { isSubscriptionActive } from '../utils/subscriptionConfig.js';
import { roomMatchesUserLocation, DEFAULT_PLATFORM_CITY } from '../utils/locationOptions.js';

function computeSubMetrics(roomList) {
  let active = 0;
  let pending = 0;
  let expired = 0;
  let verifiedRooms = 0;
  let pendingVerification = 0;
  let deletionRequests = 0;

  roomList.forEach((room) => {
    if (room.deleteRequested) {
      deletionRequests++;
    }

    if (room.verificationStatus === 'verified') {
      verifiedRooms++;
    } else if (room.verificationStatus === 'pending') {
      pendingVerification++;
    }

    const hasSub = room.subscriptionStatus !== undefined;
    if (!hasSub) return;

    if (room.paymentStatus === 'pending') {
      pending++;
    } else if (room.paymentStatus === 'paid' && isSubscriptionActive(room.subscriptionEnd)) {
      active++;
    } else if (
      room.paymentStatus === 'expired' ||
      (room.paymentStatus === 'paid' && !isSubscriptionActive(room.subscriptionEnd))
    ) {
      expired++;
    }
  });

  return { total: roomList.length, active, pending, expired, verifiedRooms, pendingVerification, deletionRequests };
}

const MetricButton = ({ active, onClick, activeClass, idleClass, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-lg border transition-all text-left ${active ? activeClass : idleClass}`}
  >
    {children}
  </button>
);

const AdminMetrics = ({
  rooms,
  adminFilter,
  setAdminFilter,
  isGlobalAdmin,
  adminScope,
  selectedLocation
}) => {
  const metrics = React.useMemo(() => {
    const allRooms = rooms || [];

    if (!isGlobalAdmin && adminScope) {
      const collegeRooms = allRooms.filter((room) => roomMatchesUserLocation(room, adminScope));
      return {
        mode: 'college',
        ...computeSubMetrics(collegeRooms),
        collegeLabel: adminScope.college,
        cityLabel: adminScope.city
      };
    }

    const city = selectedLocation?.city || DEFAULT_PLATFORM_CITY;
    const college = selectedLocation?.college || null;

    const cityRooms = allRooms.filter((room) => {
      const roomCity = (room.city || DEFAULT_PLATFORM_CITY).toLowerCase().trim();
      return roomCity === city.toLowerCase().trim();
    });

    const collegeRooms = college
      ? allRooms.filter((room) => roomMatchesUserLocation(room, { city, college }))
      : cityRooms;

    return {
      mode: 'global',
      platformTotal: allRooms.length,
      cityTotal: cityRooms.length,
      collegeTotal: collegeRooms.length,
      cityLabel: city,
      collegeLabel: college,
      ...computeSubMetrics(collegeRooms)
    };
  }, [rooms, isGlobalAdmin, adminScope, selectedLocation]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Home className="w-5 h-5 text-orange-500" />
        Admin Dashboard
      </h2>

      {metrics.mode === 'global' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-lg border bg-gray-50 border-gray-200 text-left">
            <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
              <Home className="w-3 h-3" /> Total Rooms (Platform)
            </p>
            <p className="text-xl font-bold text-gray-800">{metrics.platformTotal}</p>
          </div>
          <div className="p-3 rounded-lg border bg-sky-50 border-sky-200 text-left">
            <p className="text-xs font-semibold text-sky-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> In {metrics.cityLabel}
            </p>
            <p className="text-xl font-bold text-sky-800">{metrics.cityTotal}</p>
          </div>
          <div className="p-3 rounded-lg border bg-violet-50 border-violet-200 text-left">
            <p className="text-xs font-semibold text-violet-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Selected College
            </p>
            <p className="text-xl font-bold text-violet-800">{metrics.collegeTotal}</p>
            {metrics.collegeLabel && (
              <p className="text-[10px] text-violet-500 mt-1 line-clamp-2">{metrics.collegeLabel}</p>
            )}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${metrics.mode === 'global' ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
        <MetricButton
          active={adminFilter === 'all'}
          onClick={() => setAdminFilter('all')}
          activeClass="bg-gray-100 border-gray-400 shadow-inner"
          idleClass="bg-gray-50 border-gray-200 hover:bg-gray-100"
        >
          <p className="text-xs font-semibold text-gray-500 mb-1">
            {metrics.mode === 'college' ? 'Total Rooms (College)' : 'College Rooms'}
          </p>
          <p className="text-xl font-bold text-gray-800">{metrics.total}</p>
          {metrics.mode === 'college' && metrics.collegeLabel && (
            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{metrics.collegeLabel}</p>
          )}
        </MetricButton>

        <MetricButton
          active={adminFilter === 'verifiedRooms'}
          onClick={() => setAdminFilter('verifiedRooms')}
          activeClass="bg-emerald-100 border-emerald-400 shadow-inner"
          idleClass="bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
        >
          <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3" /> Verified
          </p>
          <p className="text-xl font-bold text-emerald-800">{metrics.verifiedRooms}</p>
        </MetricButton>

        <MetricButton
          active={adminFilter === 'pendingVerification'}
          onClick={() => setAdminFilter('pendingVerification')}
          activeClass="bg-amber-100 border-amber-400 shadow-inner"
          idleClass="bg-amber-50 border-amber-200 hover:bg-amber-100"
        >
          <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" /> Pending Ver.
          </p>
          <p className="text-xl font-bold text-amber-800">{metrics.pendingVerification}</p>
        </MetricButton>

        <MetricButton
          active={adminFilter === 'active'}
          onClick={() => setAdminFilter('active')}
          activeClass="bg-blue-100 border-blue-400 shadow-inner"
          idleClass="bg-blue-50 border-blue-200 hover:bg-blue-100"
        >
          <p className="text-xs font-semibold text-blue-600 flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3" /> Active Subs
          </p>
          <p className="text-xl font-bold text-blue-800">{metrics.active}</p>
        </MetricButton>

        <MetricButton
          active={adminFilter === 'pending'}
          onClick={() => setAdminFilter('pending')}
          activeClass="bg-orange-100 border-orange-400 shadow-inner"
          idleClass="bg-orange-50 border-orange-200 hover:bg-orange-100"
        >
          <p className="text-xs font-semibold text-orange-600 flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" /> Pending Subs
          </p>
          <p className="text-xl font-bold text-orange-800">{metrics.pending}</p>
        </MetricButton>

        <MetricButton
          active={adminFilter === 'expired'}
          onClick={() => setAdminFilter('expired')}
          activeClass="bg-red-100 border-red-400 shadow-inner"
          idleClass="bg-red-50 border-red-200 hover:bg-red-100"
        >
          <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-1">
            <AlertCircle className="w-3 h-3" /> Expired Subs
          </p>
          <p className="text-xl font-bold text-red-800">{metrics.expired}</p>
        </MetricButton>

        {isGlobalAdmin && (
          <MetricButton
            active={adminFilter === 'deletionRequests'}
            onClick={() => setAdminFilter('deletionRequests')}
            activeClass="bg-rose-100 border-rose-400 shadow-inner"
            idleClass="bg-rose-50 border-rose-200 hover:bg-rose-100"
          >
            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3" /> Del Requests
            </p>
            <p className="text-xl font-bold text-rose-800">{metrics.deletionRequests}</p>
          </MetricButton>
        )}
      </div>
    </div>
  );
};

export default AdminMetrics;
