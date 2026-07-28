import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';

const IconGlobe = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faGlobe} className={className} {...props} />;
};

export default IconGlobe;
