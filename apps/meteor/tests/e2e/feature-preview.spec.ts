import { Users } from './fixtures/userStates';
import { AccountProfile, HomeChannel } from './page-objects';
import { setSettingValueById } from './utils';
import { setUserPreferences } from './utils/setUserPreferences';
import { test, expect } from './utils/test';

test.use({ storageState: Users.admin.state });

test.describe.serial('feature preview', () => {
	let poHomeChannel: HomeChannel;
	let poAccountProfile: AccountProfile;

	test.beforeAll(async ({ api }) => {
		await setSettingValueById(api, 'Accounts_AllowFeaturePreview', true);
	});

	test.afterAll(async ({ api }) => {
		await setSettingValueById(api, 'Accounts_AllowFeaturePreview', false);
	});

	test.beforeEach(async ({ page }) => {
		poHomeChannel = new HomeChannel(page);
		poAccountProfile = new AccountProfile(page);
	});

	test('should show "Message" and "Navigation" feature sections', async ({ page }) => {
		await page.goto('/account/feature-preview');

		await expect(page.getByRole('button', { name: 'Message' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Navigation' })).toBeVisible();
	});

	test.describe('Enhanced navigation', () => {
		test.beforeAll(async ({ api }) => {
			await setUserPreferences(api, {
				featuresPreview: [
					{
						name: 'newNavigation',
						value: true,
					},
				],
			});
		});

		test.afterAll(async ({ api }) => {
			await setUserPreferences(api, {
				featuresPreview: [
					{
						name: 'newNavigation',
						value: false,
					},
				],
			});
		});

		// After moving `Enhanced navigation` out of feature preview, move these tests to sidebar.spec.ts
		test('should be able to toggle "Enhanced navigation" feature', async ({ page }) => {
			await page.goto('/account/feature-preview');

			await poAccountProfile.getAccordionItemByName('Navigation').click();
			const newNavigationCheckbox = poAccountProfile.getCheckboxByLabelText('Enhanced navigation');
			await expect(newNavigationCheckbox).toBeChecked();
			await newNavigationCheckbox.click();
			await expect(newNavigationCheckbox).not.toBeChecked();
		});

		test('should be rendering new UI with "Enhanced navigation"', async ({ page }) => {
			await page.goto('/account/feature-preview');

			await expect(poHomeChannel.navbar.navbar).toBeVisible();
		});

		test('should display "Recent" button on sidebar search section, and display recent chats when clicked', async ({ page }) => {
			await page.goto('/home');

			await poHomeChannel.sidenav.btnRecent.click();
			await expect(poHomeChannel.sidenav.sidebar.getByRole('heading', { name: 'Recent' })).toBeVisible();
		});

		test('should expand/collapse sidebar groups', async ({ page }) => {
			await page.goto('/home');
			const collapser = poHomeChannel.sidenav.firstCollapser;
			let isExpanded: boolean;

			await collapser.click();
			isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
			expect(isExpanded).toBeFalsy();

			await collapser.click();
			isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
			expect(isExpanded).toBeTruthy();
		});

		test('should expand/collapse sidebar groups with keyboard', async ({ page }) => {
			await page.goto('/home');

			const collapser = poHomeChannel.sidenav.firstCollapser;

			await expect(async () => {
				await collapser.focus();
				await expect(collapser).toBeFocused();
				await page.keyboard.press('Enter');
				const isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
				expect(isExpanded).toBeFalsy();
			}).toPass();

			await expect(async () => {
				await collapser.focus();
				await page.keyboard.press('Space');
				const isExpanded = (await collapser.getAttribute('aria-expanded')) === 'true';
				expect(isExpanded).toBeTruthy();
			}).toPass();
		});

		test('should be able to use keyboard to navigate through sidebar items', async ({ page }) => {
			await page.goto('/home');

			const collapser = poHomeChannel.sidenav.firstCollapser;
			const dataIndex = await collapser.locator('../..').getAttribute('data-index');
			const nextItem = page.locator(`[data-index="${Number(dataIndex) + 1}"]`).getByRole('link');

			await expect(async () => {
				await collapser.focus();
				await page.keyboard.press('ArrowDown');
				await expect(nextItem).toBeFocused();
			}).toPass();
		});

		test('should persist collapsed/expanded groups after page reload', async ({ page }) => {
			await page.goto('/home');

			const collapser = poHomeChannel.sidenav.firstCollapser;
			await collapser.click();
			const isExpanded = await collapser.getAttribute('aria-expanded');

			await page.reload();

			const isExpandedAfterReload = await collapser.getAttribute('aria-expanded');
			expect(isExpanded).toEqual(isExpandedAfterReload);
		});
	});
});