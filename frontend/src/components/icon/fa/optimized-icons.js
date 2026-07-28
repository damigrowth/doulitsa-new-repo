// Optimized FontAwesome icon bundle for better performance
// Centralizes all icon imports for better tree-shaking

import React from 'react';

// Import all icons used in your project (based on your existing components)
import {
  faHeart,
  faStar,
  faCheck,
  faTimes,
  faBars,
  faThumbsUp,
  faThumbsDown,
  faAngleRight,
  faAngleLeft,
  faAngleUp,
  faArrowRightLong,
  faArrowLeftLong,
  faArrowDownLong,
  faMinus,
  faEye,
  faEyeSlash,
  faPlay,
  faFlag,
  faTrashCan,
  faTrash,
  faEnvelope,
  faLink,
  faXmark,
  faInfoCircle,
  faClock,
  faExclamationCircle,
  faExclamationTriangle,
  faKey,
  faPaperPlane,
  faMagnifyingGlass,
  faUsers,
  faMusic,
  faFloppyDisk,
  faCheckCircle,
  faTimesCircle,
  faPhone,
  faGlobe,
  faVideo,
  faQuoteLeft,
} from '@fortawesome/free-solid-svg-icons';

import {
  faHeart as farHeart,
  faStar as farStar,
  faCheckCircle as farCheckCircle,
  faTimesCircle as farTimesCircle,
  faEnvelope as farEnvelope,
  faEye as farEye,
  faFlag as farFlag,
  faTrashCan as farTrashCan,
} from '@fortawesome/free-regular-svg-icons';

import {
  faFacebookF,
  faLinkedinIn,
  faTwitter,
  faYoutube,
  faGithub,
  faInstagram,
  faBehance,
  faDribbble,
  faViber,
  faWhatsapp,
  faGoogle,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';

// Centralized icon map for dynamic access
export const iconMap = {
  // Solid icons
  'heart-solid': faHeart,
  'star-solid': faStar,
  'check-solid': faCheck,
  'times-solid': faTimes,
  'bars-solid': faBars,
  'thumbs-up-solid': faThumbsUp,
  'thumbs-down-solid': faThumbsDown,
  'angle-right-solid': faAngleRight,
  'angle-left-solid': faAngleLeft,
  'angle-up-solid': faAngleUp,
  'arrow-right-long-solid': faArrowRightLong,
  'arrow-left-long-solid': faArrowLeftLong,
  'arrow-down-long-solid': faArrowDownLong,
  'minus-solid': faMinus,
  'eye-solid': faEye,
  'eye-slash-solid': faEyeSlash,
  'play-solid': faPlay,
  'flag-solid': faFlag,
  'trash-can-solid': faTrashCan,
  'trash-solid': faTrash,
  'envelope-solid': faEnvelope,
  'link-solid': faLink,
  'xmark-solid': faXmark,
  'info-circle-solid': faInfoCircle,
  'clock-solid': faClock,
  'exclamation-circle-solid': faExclamationCircle,
  'exclamation-triangle-solid': faExclamationTriangle,
  'key-solid': faKey,
  'paper-plane-solid': faPaperPlane,
  'magnifying-glass-solid': faMagnifyingGlass,
  'users-solid': faUsers,
  'music-solid': faMusic,
  'floppy-disk-solid': faFloppyDisk,
  'check-circle-solid': faCheckCircle,
  'times-circle-solid': faTimesCircle,
  'phone-solid': faPhone,
  'globe-solid': faGlobe,
  'video-solid': faVideo,
  'quote-left-solid': faQuoteLeft,

  // Regular icons
  'heart-regular': farHeart,
  'star-regular': farStar,
  'check-circle-regular': farCheckCircle,
  'times-circle-regular': farTimesCircle,
  'envelope-regular': farEnvelope,
  'eye-regular': farEye,
  'flag-regular': farFlag,
  'trash-can-regular': farTrashCan,

  // Brand icons
  'facebook-f': faFacebookF,
  'linkedin-in': faLinkedinIn,
  'twitter': faTwitter,
  'x-twitter': faXTwitter,
  'youtube': faYoutube,
  'github': faGithub,
  'instagram': faInstagram,
  'behance': faBehance,
  'dribbble': faDribbble,
  'viber': faViber,
  'whatsapp': faWhatsapp,
  'google': faGoogle,
};

// Utility function to get icon by name and type
export const getIcon = (iconName, type = 'solid') => {
  const key = type === 'solid' ? `${iconName}-solid` : 
              type === 'regular' ? `${iconName}-regular` : 
              iconName; // For brands, use name directly
  
  return iconMap[key] || iconMap[`${iconName}-solid`] || null;
};

// Dynamic icon component for better performance
export const DynamicIcon = ({ name, type = 'solid', className = '', ...props }) => {
  const icon = getIcon(name, type);
  
  if (!icon) {
    console.warn(`Icon "${name}" with type "${type}" not found`);
    return null;
  }

  // Use direct import for better compatibility
  const { FontAwesomeIcon } = require('@fortawesome/react-fontawesome');
  return React.createElement(FontAwesomeIcon, { icon, className, ...props });
};

// Export individual icon objects for tree-shaking
export {
  faHeart,
  faStar,
  faCheck,
  faTimes,
  faBars,
  faThumbsUp,
  faThumbsDown,
  faAngleRight,
  faAngleLeft,
  faAngleUp,
  faArrowRightLong,
  faArrowLeftLong,
  faArrowDownLong,
  faMinus,
  faEye,
  faEyeSlash,
  faPlay,
  faFlag,
  faTrashCan,
  faTrash,
  faEnvelope,
  faLink,
  faXmark,
  faInfoCircle,
  faClock,
  faExclamationCircle,
  faExclamationTriangle,
  faKey,
  faPaperPlane,
  faMagnifyingGlass,
  faUsers,
  faMusic,
  faFloppyDisk,
  faCheckCircle,
  faTimesCircle,
  faPhone,
  faGlobe,
  faVideo,
  faQuoteLeft,
  farHeart,
  farStar,
  farCheckCircle,
  farTimesCircle,
  farEnvelope,
  farEye,
  farFlag,
  farTrashCan,
  faFacebookF,
  faLinkedinIn,
  faTwitter,
  faYoutube,
  faGithub,
  faInstagram,
  faBehance,
  faDribbble,
  faViber,
  faWhatsapp,
  faGoogle,
  faXTwitter,
};
