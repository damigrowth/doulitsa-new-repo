// Optimized FontAwesome component with performance improvements
import { memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getIcon } from './optimized-icons';

// Base optimized icon component
const OptimizedIcon = memo(function OptimizedIcon({ 
  iconName, 
  type = 'solid', 
  className = '', 
  size,
  color,
  ...props 
}) {
  const icon = getIcon(iconName, type);
  
  if (!icon) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Icon "${iconName}" with type "${type}" not found`);
    }
    return null;
  }

  return (
    <FontAwesomeIcon 
      icon={icon} 
      className={className}
      size={size}
      color={color}
      {...props} 
    />
  );
});

// Optimized versions of your existing icon components
export const IconHeart = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="heart" type={type} {...props} />
));

export const IconStar = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="star" type={type} {...props} />
));

export const IconCheck = memo((props) => (
  <OptimizedIcon iconName="check" {...props} />
));

export const IconTimes = memo((props) => (
  <OptimizedIcon iconName="times" {...props} />
));

export const IconBars = memo((props) => (
  <OptimizedIcon iconName="bars" {...props} />
));

export const IconThumbsUp = memo((props) => (
  <OptimizedIcon iconName="thumbs-up" {...props} />
));

export const IconThumbsDown = memo((props) => (
  <OptimizedIcon iconName="thumbs-down" {...props} />
));

export const IconAngleRight = memo((props) => (
  <OptimizedIcon iconName="angle-right" {...props} />
));

export const IconAngleLeft = memo((props) => (
  <OptimizedIcon iconName="angle-left" {...props} />
));

export const IconAngleUp = memo((props) => (
  <OptimizedIcon iconName="angle-up" {...props} />
));

export const ArrowRightLong = memo((props) => (
  <OptimizedIcon iconName="arrow-right-long" {...props} />
));

export const ArrowLeftLong = memo((props) => (
  <OptimizedIcon iconName="arrow-left-long" {...props} />
));

export const IconArrowDownLong = memo((props) => (
  <OptimizedIcon iconName="arrow-down-long" {...props} />
));

export const IconMinus = memo((props) => (
  <OptimizedIcon iconName="minus" {...props} />
));

export const IconEye = memo((props) => (
  <OptimizedIcon iconName="eye" {...props} />
));

export const IconEyeSlash = memo((props) => (
  <OptimizedIcon iconName="eye-slash" {...props} />
));

export const IconPlay = memo((props) => (
  <OptimizedIcon iconName="play" {...props} />
));

export const IconFlag = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="flag" type={type} {...props} />
));

export const IconTrashCan = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="trash-can" type={type} {...props} />
));

export const IconTrash = memo((props) => (
  <OptimizedIcon iconName="trash" {...props} />
));

export const IconEnvelope = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="envelope" type={type} {...props} />
));

export const IconLink = memo((props) => (
  <OptimizedIcon iconName="link" {...props} />
));

export const IconXmark = memo((props) => (
  <OptimizedIcon iconName="xmark" {...props} />
));

export const IconInfoCircle = memo((props) => (
  <OptimizedIcon iconName="info-circle" {...props} />
));

export const IconClock = memo((props) => (
  <OptimizedIcon iconName="clock" {...props} />
));

export const IconExclamationCircle = memo((props) => (
  <OptimizedIcon iconName="exclamation-circle" {...props} />
));

export const IconExclamationTriangle = memo((props) => (
  <OptimizedIcon iconName="exclamation-triangle" {...props} />
));

export const IconKey = memo((props) => (
  <OptimizedIcon iconName="key" {...props} />
));

export const IconPaperPlane = memo((props) => (
  <OptimizedIcon iconName="paper-plane" {...props} />
));

export const IconMagnifyingGlass = memo((props) => (
  <OptimizedIcon iconName="magnifying-glass" {...props} />
));

export const IconUsers = memo((props) => (
  <OptimizedIcon iconName="users" {...props} />
));

export const IconMusic = memo((props) => (
  <OptimizedIcon iconName="music" {...props} />
));

export const IconFloppyDisk = memo((props) => (
  <OptimizedIcon iconName="floppy-disk" {...props} />
));

export const IconCheckCircle = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="check-circle" type={type} {...props} />
));

export const IconTimesCircle = memo(({ type = 'solid', ...props }) => (
  <OptimizedIcon iconName="times-circle" type={type} {...props} />
));

export const IconPhone = memo((props) => (
  <OptimizedIcon iconName="phone" {...props} />
));

export const IconGlobe = memo((props) => (
  <OptimizedIcon iconName="globe" {...props} />
));

export const IconVideo = memo((props) => (
  <OptimizedIcon iconName="video" {...props} />
));

export const IconQuoteLeft = memo((props) => (
  <OptimizedIcon iconName="quote-left" {...props} />
));

// Brand icons
export const IconFacebookF = memo((props) => (
  <OptimizedIcon iconName="facebook-f" type="brand" {...props} />
));

export const IconLinkedinIn = memo((props) => (
  <OptimizedIcon iconName="linkedin-in" type="brand" {...props} />
));

export const IconTwitter = memo((props) => (
  <OptimizedIcon iconName="twitter" type="brand" {...props} />
));

export const IconX = memo((props) => (
  <OptimizedIcon iconName="x-twitter" type="brand" {...props} />
));

export const IconYoutube = memo((props) => (
  <OptimizedIcon iconName="youtube" type="brand" {...props} />
));

export const IconGithub = memo((props) => (
  <OptimizedIcon iconName="github" type="brand" {...props} />
));

export const IconInstagram = memo((props) => (
  <OptimizedIcon iconName="instagram" type="brand" {...props} />
));

export const IconBehance = memo((props) => (
  <OptimizedIcon iconName="behance" type="brand" {...props} />
));

export const IconDribbble = memo((props) => (
  <OptimizedIcon iconName="dribbble" type="brand" {...props} />
));

export const IconViber = memo((props) => (
  <OptimizedIcon iconName="viber" type="brand" {...props} />
));

export const IconWhatsapp = memo((props) => (
  <OptimizedIcon iconName="whatsapp" type="brand" {...props} />
));

export const IconGoogle = memo((props) => (
  <OptimizedIcon iconName="google" type="brand" {...props} />
));

// Aliases for backward compatibility
export const TimesIcon = IconTimes;

// Export the base component for custom use
export { OptimizedIcon };
