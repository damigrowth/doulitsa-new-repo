import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDribbble } from '@fortawesome/free-brands-svg-icons';

const IconDribbble = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faDribbble} className={className} {...props} />;
};

export default IconDribbble;
