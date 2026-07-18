export const CITIES = [
  'Kolhapur',
  'Sangli',
  'Ichalkaranji',
  'Islampur',
  'Satara',
  'Miraj',
  'Karad',
  'Other'
];

/** User profile / room stream: Engineering vs Medical */
export const STUDENT_STREAMS = [
  { value: 'engineering', label: 'Engineering Student' },
  { value: 'medical', label: 'Medical Student' }
];

/** Room listings: who the room is meant for (no "both") */
export const ROOM_STUDENT_STREAMS = [
  { value: 'engineering', label: 'Engineering Students' },
  { value: 'medical', label: 'Medical Students' }
];

export const DEFAULT_STUDENT_STREAM = 'engineering';
export const DEFAULT_PLATFORM_CITY = 'Kolhapur';

/**
 * Colleges by student stream and city.
 * Selecting Medical shows medical colleges; Engineering shows engineering colleges.
 */
export const COLLEGES_BY_STREAM_AND_CITY = {
  engineering: {
    Kolhapur: [
      "Dr. D. Y. Patil Prathisthan's College of Engineering, Salokhenagar (DYPSN) Kolhapur",
      'Shivaji University, Kolhapur',
      "KIT's College of Engineering, Kolhapur",
      "Bharati Vidyapeeth's College of Engineering, Kolhapur",
      'D. Y. Patil College of Engineering and Technology, Kolhapur',
      'Sanjay Ghodawat University, Kolhapur',
      'Other'
    ],
    Sangli: [
      'Padmabhooshan Vasantraodada Patil Institute of Technology, Sangli',
      'Other'
    ],
    Ichalkaranji: [
      "DKTE's Textile and Engineering Institute, Ichalkaranji",
      'Other'
    ],
    Islampur: [
      'Rajarambapu Institute of Technology, Islampur',
      'Other'
    ],
    Satara: ['Other'],
    Miraj: ['Other'],
    Karad: ['Other'],
    Other: ['Other']
  },
  medical: {
    Kolhapur: [
      'Rajarshi Chhatrapati Shahu Maharaj Government Medical College, Kolhapur',
      'Dr. D. Y. Patil Medical College, Kolhapur',
      'Other'
    ],
    Sangli: [
      'Bharati Vidyapeeth Deemed University Medical College & Hospital, Sangli',
      'Prakash Institute of Medical Sciences and Research, Sangli',
      'Other'
    ],
    Miraj: [
      'Government Medical College, Miraj',
      'Other'
    ],
    Karad: [
      'Krishna Institute of Medical Sciences, Karad',
      'Other'
    ],
    Satara: [
      'Government Medical College, Satara',
      'Other'
    ],
    Ichalkaranji: ['Other'],
    Islampur: ['Other'],
    Other: ['Other']
  }
};

/** Flat engineering list for backward compatibility */
export const COLLEGES = Object.values(COLLEGES_BY_STREAM_AND_CITY.engineering)
  .flat()
  .filter((name, index, arr) => name !== 'Other' && arr.indexOf(name) === index)
  .concat('Other');

export const DEFAULT_PLATFORM_COLLEGE =
  COLLEGES_BY_STREAM_AND_CITY.engineering.Kolhapur[0];

const normalize = (value) => (value || '').toLowerCase().trim();

/**
 * Colleges for a city filtered by student stream (engineering / medical).
 */
export function getCollegesForCity(city, stream = DEFAULT_STUDENT_STREAM) {
  const streamKey = normalize(stream) === 'medical' ? 'medical' : 'engineering';
  const byCity = COLLEGES_BY_STREAM_AND_CITY[streamKey] || COLLEGES_BY_STREAM_AND_CITY.engineering;

  if (!city) {
    return Object.values(byCity)
      .flat()
      .filter((name, index, arr) => arr.indexOf(name) === index);
  }

  const list = byCity[city];
  if (list?.length) return list;
  return byCity.Other || ['Other'];
}

/**
 * Filter rooms by user's student stream (engineering / medical).
 * Legacy rooms without studentStream are treated as engineering.
 */
export function roomMatchesStudentStream(room, selectedStream) {
  if (!selectedStream) return true;
  const roomStream = normalize(room.studentStream) || DEFAULT_STUDENT_STREAM;
  if (roomStream === 'both') return true;
  return roomStream === normalize(selectedStream);
}

const isDyspnCollege = (value) => {
  const v = normalize(value);
  return v.includes('dypsn') || (v.includes('d. y. patil') && v.includes('salokhenagar'));
};

/**
 * Whether a room should be shown for the user's selected city + college.
 * Rooms missing city/college are treated as the platform default (DYPSN / Kolhapur).
 */
export function roomMatchesUserLocation(room, selectedLocation) {
  if (!selectedLocation?.city || !selectedLocation?.college) return true;

  const roomCity = normalize(room.city) || normalize(DEFAULT_PLATFORM_CITY);
  const selectedCity = normalize(selectedLocation.city);
  if (roomCity !== selectedCity) return false;

  const roomCollege = normalize(room.college) || normalize(DEFAULT_PLATFORM_COLLEGE);
  const selectedCollege = normalize(selectedLocation.college);

  if (roomCollege === selectedCollege) return true;
  if (isDyspnCollege(roomCollege) && isDyspnCollege(selectedCollege)) return true;

  return false;
}
