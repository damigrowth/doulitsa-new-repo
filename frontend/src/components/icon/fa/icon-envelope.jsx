import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

const IconEnvelope = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faEnvelope} className={className} {...props} />;
};

export default IconEnvelope;
