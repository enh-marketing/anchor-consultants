import { ArrowRightIcon, LockIcon } from '@sanity/icons';
import { Box, Button, Card, Flex, Heading, Stack, Text } from '@sanity/ui';
import { useWorkspace, useWorkspaces } from 'sanity';
// Shared with the site's test suite rather than duplicated here: `npm test`
// only picks up test files under `src`, and this logic fails silently.
import { swapBasePath } from '../../src/lib/studio-workspace';

/**
 * The pane behind "Form enquiries" in the content sidebar.
 *
 * Enquiries cannot be listed here. A Sanity workspace is bound to one dataset,
 * and enquiries deliberately live in a separate private one: the content
 * dataset is public-read so the static build needs no credential, and anything
 * in it is readable by anyone who knows the project id, which is on a public
 * repository (defect #29). Names, emails and phone numbers cannot go there.
 *
 * So this is a signpost rather than a list. It exists because the alternative
 * was worse: without it the sidebar simply had no mention of enquiries, and the
 * only way across was the workspace menu, which you have to know to look for.
 */

export function EnquiriesPane() {
  const current = useWorkspace();
  const target = useWorkspaces().find((workspace) => workspace.name === 'submissions');

  // Defensive rather than expected: the workspace is declared in
  // sanity.config.ts. If it were ever renamed, saying so beats a dead button.
  if (!target) {
    return (
      <Card padding={4}>
        <Text muted size={1}>
          The Form submissions workspace is not configured in this Studio.
        </Text>
      </Card>
    );
  }

  const href =
    typeof window === 'undefined'
      ? target.basePath
      : swapBasePath(window.location.pathname, current.basePath, target.basePath);

  return (
    <Card padding={4} height="fill">
      <Stack gap={4}>
        <Heading as="h1" size={1}>
          Form enquiries
        </Heading>

        <Text muted size={1}>
          Enquiries are stored separately from the website content, in a private area that only
          signed-in team members can read. That keeps names, emails and phone numbers out of the
          public content the site is built from.
        </Text>

        <Box>
          <Button
            as="a"
            href={href}
            text="Open Form enquiries"
            tone="primary"
            iconRight={ArrowRightIcon}
          />
        </Box>

        <Card padding={3} radius={2} tone="transparent">
          <Flex align="flex-start" gap={3}>
            <Text muted size={1}>
              <LockIcon />
            </Text>
            <Text muted size={1}>
              You can also switch at any time from the workspace menu at the top of the screen.
              Nothing here can be edited: enquiries are a record of what somebody sent.
            </Text>
          </Flex>
        </Card>
      </Stack>
    </Card>
  );
}
