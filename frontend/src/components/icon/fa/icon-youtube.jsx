import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faYoutube } from '@fortawesome/free-brands-svg-icons';

const IconYoutube = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faYoutube} className={className} {...props} />;
};

export default IconYoutube;
