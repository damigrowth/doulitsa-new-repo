// FontAwesome Icons Export - Both Original and Optimized Versions

// ===== EXISTING COMPONENTS (keep for backward compatibility) =====
export { default as IconTimes } from './icon-times';
export { default as IconBars } from './icon-bars';
export { default as IconCheck } from './icon-check';
export { default as IconQuoteLeft } from './icon-quote-left';
export { default as IconAngleRight } from './icon-angle-right';
export { default as IconStar } from './icon-star';
export { default as IconThumbsUp } from './icon-thumbs-up';
export { default as IconThumbsDown } from './icon-thumbs-down';
export { default as IconFacebookF } from './icon-facebook-f';
export { default as IconLinkedinIn } from './icon-linkedin-in';
export { default as IconX } from './icon-x';
export { default as IconYoutube } from './icon-youtube';
export { default as IconGithub } from './icon-github';
export { default as IconInstagram } from './icon-instagram';
export { default as IconBehance } from './icon-behance';
export { default as IconDribbble } from './icon-dribbble';
export { default as IconViber } from './icon-viber';
export { default as IconWhatsapp } from './icon-whatsapp';
export { default as IconAngleLeft } from './icon-angle-left';
export { default as IconMusic } from './icon-music';
export { default as IconFloppyDisk } from './icon-floppy-disk';
export { default as IconCheckCircle } from './icon-check-circle';
export { default as IconTimesCircle } from './icon-times-circle';
export { default as IconMinus } from './icon-minus';
export { default as IconEyeSlash } from './icon-eye-slash';
export { default as IconEye } from './icon-eye';
export { default as IconTwitter } from './icon-twitter';
export { default as IconPhone } from './icon-phone';
export { default as IconGlobe } from './icon-globe';
export { default as IconVideo } from './icon-video';
export { default as IconPlay } from './icon-play';
export { default as IconFlag } from './icon-flag';
export { default as IconAngleUp } from './icon-angle-up';
export { default as IconTrashCan } from './icon-trash-can';
export { default as IconEnvelope } from './icon-envelope';
export { default as IconLink } from './icon-link';
export { default as IconXmark } from './icon-xmark';
export { default as IconInfoCircle } from './icon-info-circle';
export { default as IconClock } from './icon-clock';
export { default as IconExclamationCircle } from './icon-exclamation-circle';
export { default as IconExclamationTriangle } from './icon-exclamation-triangle';
export { default as IconGoogle } from './icon-google';
export { default as ArrowRightLong } from './icon-arrow-right-long';
export { default as ArrowLeftLong } from './icon-arrow-left-long';
export { default as IconArrowDownLong } from './icon-arrow-down-long';
export { default as IconKey } from './icon-key';
export { default as IconPaperPlane } from './icon-paper-plane';
export { default as IconHeart } from './icon-heart';
export { default as IconTrash } from './icon-trash';
export { default as IconMagnifyingGlass } from './icon-magnifying-glass';
export { default as TimesIcon } from './icon-times';
export { default as IconUsers } from './icon-users';

// ===== OPTIMIZED COMPONENTS (recommended for new code) =====
export {
  OptimizedIcon,
  IconHeart as IconHeartOpt,
  IconStar as IconStarOpt,
  IconCheck as IconCheckOpt,
  IconTimes as IconTimesOpt,
  IconBars as IconBarsOpt,
  IconThumbsUp as IconThumbsUpOpt,
  IconThumbsDown as IconThumbsDownOpt,
  IconAngleRight as IconAngleRightOpt,
  IconAngleLeft as IconAngleLeftOpt,
  IconAngleUp as IconAngleUpOpt,
  ArrowRightLong as ArrowRightLongOpt,
  ArrowLeftLong as ArrowLeftLongOpt,
  IconArrowDownLong as IconArrowDownLongOpt,
  IconMinus as IconMinusOpt,
  IconEye as IconEyeOpt,
  IconEyeSlash as IconEyeSlashOpt,
  IconPlay as IconPlayOpt,
  IconFlag as IconFlagOpt,
  IconTrashCan as IconTrashCanOpt,
  IconTrash as IconTrashOpt,
  IconEnvelope as IconEnvelopeOpt,
  IconLink as IconLinkOpt,
  IconXmark as IconXmarkOpt,
  IconInfoCircle as IconInfoCircleOpt,
  IconClock as IconClockOpt,
  IconExclamationCircle as IconExclamationCircleOpt,
  IconExclamationTriangle as IconExclamationTriangleOpt,
  IconKey as IconKeyOpt,
  IconPaperPlane as IconPaperPlaneOpt,
  IconMagnifyingGlass as IconMagnifyingGlassOpt,
  IconUsers as IconUsersOpt,
  IconMusic as IconMusicOpt,
  IconFloppyDisk as IconFloppyDiskOpt,
  IconCheckCircle as IconCheckCircleOpt,
  IconTimesCircle as IconTimesCircleOpt,
  IconPhone as IconPhoneOpt,
  IconGlobe as IconGlobeOpt,
  IconVideo as IconVideoOpt,
  IconQuoteLeft as IconQuoteLeftOpt,
  // Brand icons
  IconFacebookF as IconFacebookFOpt,
  IconLinkedinIn as IconLinkedinInOpt,
  IconTwitter as IconTwitterOpt,
  IconX as IconXOpt,
  IconYoutube as IconYoutubeOpt,
  IconGithub as IconGithubOpt,
  IconInstagram as IconInstagramOpt,
  IconBehance as IconBehanceOpt,
  IconDribbble as IconDribbbleOpt,
  IconViber as IconViberOpt,
  IconWhatsapp as IconWhatsappOpt,
  IconGoogle as IconGoogleOpt,
} from './optimized-components';

// ===== UTILITIES =====
export { iconMap, getIcon } from './optimized-icons';

// ===== USAGE EXAMPLES =====
/*
// Using existing components (no change needed):
import { IconHeart, ArrowRightLong } from '@/components/icon/fa';

// Using optimized components (recommended for new code):
import { IconHeartOpt, ArrowRightLongOpt } from '@/components/icon/fa';

// Using the utility function for dynamic icons:
import { OptimizedIcon } from '@/components/icon/fa';
<OptimizedIcon iconName="heart" type="solid" />
<OptimizedIcon iconName="heart" type="regular" />

// Using the centralized icon getter:
import { getIcon } from '@/components/icon/fa';
const heartIcon = getIcon('heart', 'solid');
*/
