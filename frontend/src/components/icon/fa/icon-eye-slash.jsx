import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const IconEyeSlash = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faEyeSlash} className={className} {...props} />;
};

export default IconEyeSlash;
