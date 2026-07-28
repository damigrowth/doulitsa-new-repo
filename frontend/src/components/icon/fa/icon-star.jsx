import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';

const IconStar = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faStar} className={className} {...props} />;
};

export default IconStar;
