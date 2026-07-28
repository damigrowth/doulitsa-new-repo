import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

const IconLink = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faLink} className={className} {...props} />;
};

export default IconLink;
