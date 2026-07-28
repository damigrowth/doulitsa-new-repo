import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const IconGithub = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faGithub} className={className} {...props} />;
};

export default IconGithub;
