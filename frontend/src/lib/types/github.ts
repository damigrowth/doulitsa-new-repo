// GitHub API response types for our use case

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string; // base64 encoded
  encoding?: string;
}

export interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubCompareResult {
  status: 'identical' | 'ahead' | 'behind' | 'diverged';
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubCommit[];
  files?: Array<{
    sha: string;
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export interface DatasetFileInfo {
  path: string;
  content: string;
  sha: string;
  lastModified: string;
}

// Action response types
export interface GitStatusResponse {
  success: boolean;
  data?: {
    branch: string;
    hasDatasetChanges: boolean;
    modifiedFiles: Array<{
      file: string;
      status: 'Modified' | 'Added' | 'Deleted';
      sha?: string;
    }>;
    datasetDiffs: Record<string, string>;
    datasetModifiedCount: number;
    ahead_by?: number;
    behind_by?: number;
  };
  error?: string;
}

export interface CommitResponse {
  success: boolean;
  data?: {
    commitSha: string;
    message: string;
    filesCommitted: string[];
    commitUrl: string;
  };
  error?: string;
}

export interface PushResponse {
  success: boolean;
  data?: {
    branch: string;
    commitCount: number;
  };
  error?: string;
}

export interface RecentCommitsResponse {
  success: boolean;
  data?: {
    commits: Array<{
      hash: string;
      shortHash: string;
      author: string;
      date: string;
      message: string;
      url: string;
    }>;
  };
  error?: string;
}

export interface UndoCommitResponse {
  success: boolean;
  data?: {
    branch: string;
    undoneCommits: Array<{
      sha: string;
      shortSha: string;
      message: string;
      author: string;
      date: string;
    }>;
    newHeadSha: string;
    newHeadUrl: string;
  };
  error?: string;
}

export interface MergeBranchResponse {
  success: boolean;
  data?: {
    sourceBranch: string;
    targetBranch: string;
    mergeCommitSha: string;
    mergeCommitUrl: string;
    message: string;
  };
  error?: string;
}
