#!/bin/bash
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}=== MCP Client Installer Publishing Script ===${NC}\n"

# Parse arguments
DRY_RUN=false
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--dry-run] [--skip-tests]"
      exit 1
      ;;
  esac
done

cd "$PROJECT_ROOT"

# Step 1: Verify package.json
echo -e "${BLUE}Step 1: Verifying package.json...${NC}"
if [[ ! -f "package.json" ]]; then
  echo -e "${RED}Error: package.json not found${NC}"
  exit 1
fi

# Check required fields
PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "")
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
MAIN=$(node -p "require('./package.json').main" 2>/dev/null || echo "")

if [[ -z "$PACKAGE_NAME" ]]; then
  echo -e "${RED}Error: package.json missing 'name' field${NC}"
  exit 1
fi

if [[ -z "$VERSION" ]]; then
  echo -e "${RED}Error: package.json missing 'version' field${NC}"
  exit 1
fi

if [[ -z "$MAIN" ]]; then
  echo -e "${RED}Error: package.json missing 'main' field${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Package: $PACKAGE_NAME@$VERSION${NC}"
echo -e "${GREEN}✓ Main entry: $MAIN${NC}\n"

# Step 2: Verify .npmignore
echo -e "${BLUE}Step 2: Verifying .npmignore...${NC}"
if [[ ! -f ".npmignore" ]]; then
  echo -e "${YELLOW}Warning: .npmignore not found${NC}"
else
  # Check that tests directory is excluded
  if grep -q "^tests/" .npmignore 2>/dev/null; then
    echo -e "${GREEN}✓ tests/ directory excluded${NC}"
  else
    echo -e "${YELLOW}Warning: tests/ directory not excluded in .npmignore${NC}"
  fi

  # Check that node_modules is excluded
  if grep -q "^node_modules/" .npmignore 2>/dev/null; then
    echo -e "${GREEN}✓ node_modules/ directory excluded${NC}"
  else
    echo -e "${YELLOW}Warning: node_modules/ directory not excluded in .npmignore${NC}"
  fi
fi
echo ""

# Step 3: Run tests
if [[ "$SKIP_TESTS" == "false" ]]; then
  echo -e "${BLUE}Step 3: Running all tests...${NC}"

  # Check if pnpm test script exists
  HAS_TEST_SCRIPT=$(node -p "Boolean(require('./package.json').scripts?.test)" 2>/dev/null || echo "false")

  if [[ "$HAS_TEST_SCRIPT" == "true" ]]; then
    if ! pnpm test; then
      echo -e "${RED}✗ Tests failed. Publishing blocked.${NC}"
      echo -e "${YELLOW}Fix failing tests before publishing.${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ All tests passed${NC}\n"
  else
    echo -e "${YELLOW}Warning: No test script found in package.json${NC}\n"
  fi
else
  echo -e "${YELLOW}Step 3: Skipping tests (--skip-tests flag)${NC}\n"
fi

# Step 4: Verify main entry file exists
echo -e "${BLUE}Step 4: Verifying main entry file...${NC}"
if [[ ! -f "$MAIN" ]]; then
  echo -e "${RED}Error: Main entry file not found: $MAIN${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Main entry file exists: $MAIN${NC}\n"

# Step 5: Check for uncommitted changes
echo -e "${BLUE}Step 5: Checking for uncommitted changes...${NC}"
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
  git status --short
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Publishing cancelled${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ No uncommitted changes${NC}\n"
fi

# Step 6: Dry run npm pack
echo -e "${BLUE}Step 6: Running dry run (npm pack)...${NC}"
PACK_OUTPUT=$(npm pack --dry-run 2>&1)
if [[ $? -ne 0 ]]; then
  echo -e "${RED}Error: npm pack failed${NC}"
  echo "$PACK_OUTPUT"
  exit 1
fi

echo -e "${GREEN}✓ npm pack succeeded${NC}"
echo -e "${BLUE}Package contents:${NC}"
echo "$PACK_OUTPUT" | grep -E '^\s+[0-9]' || echo "$PACK_OUTPUT"
echo ""

# Extract tarball name from dry run
TARBALL_NAME=$(echo "$PACK_OUTPUT" | grep -o '[a-z0-9@/-]*.tgz$' | head -1)
if [[ -z "$TARBALL_NAME" ]]; then
  TARBALL_NAME="$PACKAGE_NAME-$VERSION.tgz"
fi

# Count files
FILE_COUNT=$(echo "$PACK_OUTPUT" | grep -c -E '^\s+[0-9]' || echo "unknown")
echo -e "${BLUE}Total files: $FILE_COUNT${NC}\n"

# Step 7: Publish or exit
if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${GREEN}=== Dry Run Complete ===${NC}"
  echo -e "${BLUE}Package: $PACKAGE_NAME@$VERSION${NC}"
  echo -e "${BLUE}Tarball: $TARBALL_NAME${NC}"
  echo -e "${YELLOW}No actual publishing performed (--dry-run mode)${NC}"
  exit 0
fi

echo -e "${BLUE}=== Ready to Publish ===${NC}"
echo -e "${BLUE}Package: $PACKAGE_NAME@$VERSION${NC}"
echo -e "${BLUE}Tarball: $TARBALL_NAME${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: This script does NOT automatically publish to npm.${NC}"
echo -e "${YELLOW}To publish, run manually:${NC}"
echo -e "${GREEN}  npm publish${NC}"
echo ""
echo -e "${YELLOW}Or for scoped packages:${NC}"
echo -e "${GREEN}  npm publish --access public${NC}"
echo ""
echo -e "${BLUE}Pre-publish verification complete!${NC}"
