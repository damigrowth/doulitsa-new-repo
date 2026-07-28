import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as farHeart } from '@fortawesome/free-regular-svg-icons';

const IconHeart = ({ className = '', type = 'solid', ...props }) => {
  const icon = type === 'solid' ? faHeart : farHeart;
  return <FontAwesomeIcon icon={icon} className={className} {...props} />;
};

export default IconHeart;
